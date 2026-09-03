import { effect, signal } from "@preact/signals";
import { refreshXray } from "./xray";

export const VERIFICATION_STATES = ["unlinked", "needs-review", "verified", "stale", "contradicted"];
export const EVIDENCE_TYPES = [
  "experiment-result",
  "result-file",
  "evaluation-script",
  "configuration",
  "implementation",
  "figure-source",
  "table-source",
  "dataset",
  "commit",
  "analysis-artifact",
  "other",
];
export const PROVENANCE_RELATIONS = ["supports", "produces", "describes", "derived-from"];
export const EXPERIMENT_STATUSES = ["planned", "running", "completed", "failed", "superseded"];

const TRACKABLE_KINDS = new Set(["claim", "method", "figure", "table"]);

const now = () => new Date().toISOString();
const makeId = (prefix) => `${prefix}-${crypto.randomUUID()}`;
const cloneEmptyData = () => ({ version: 2, experiments: [], objects: [], evidence: [], links: [], diffReviews: {} });

function safeLoad(storageKey) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey));
    if (!parsed || ![1, 2].includes(parsed.version)) return cloneEmptyData();
    return {
      version: 2,
      experiments: Array.isArray(parsed.experiments) ? parsed.experiments : [],
      objects: Array.isArray(parsed.objects) ? parsed.objects : [],
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
      links: Array.isArray(parsed.links) ? parsed.links : [],
      diffReviews: parsed.diffReviews && typeof parsed.diffReviews === "object" ? parsed.diffReviews : {},
    };
  } catch (_) {
    return cloneEmptyData();
  }
}

function safeSave(storageKey, value) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch (_) {
    // Persistence is best-effort; the live editor state remains usable if storage is unavailable.
  }
}

const sectionTitle = (selection) => selection?.section?.title || "Front matter";
const hasQuantitativeValue = (text) => /(?:\d+(?:\.\d+)?\s*%|\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)/i.test(text || "");

export function createProvenanceStore(editorId) {
  const storageKey = `myst/provenance/${editorId}`;
  const data = signal(safeLoad(storageKey));
  const xrayActive = signal(false);
  const persistenceCleanup = effect(() => safeSave(storageKey, data.value));

  const findObjectForSelection = (selection) => {
    if (!selection?.snippet) return null;
    const objects = data.value.objects;
    const exactRange = objects.find(
      (object) =>
        object.anchor.from === selection.from && object.anchor.to === selection.to && object.anchor.sectionTitle === sectionTitle(selection),
    );
    if (exactRange) return exactRange;
    return objects.find((object) => object.anchor.snippet === selection.snippet && object.anchor.sectionTitle === sectionTitle(selection)) || null;
  };

  const createExperiment = (input) => {
    if (!input?.name?.trim()) return null;
    const timestamp = now();
    const experiment = {
      id: input.id?.trim() || makeId("run"),
      name: input.name.trim(),
      status: EXPERIMENT_STATUSES.includes(input.status) ? input.status : "planned",
      method: input.method?.trim() || "",
      parameters: input.parameters && typeof input.parameters === "object" ? { ...input.parameters } : {},
      metrics: input.metrics && typeof input.metrics === "object" ? { ...input.metrics } : {},
      datasets: Array.isArray(input.datasets) ? [...input.datasets] : [],
      artifacts: Array.isArray(input.artifacts) ? [...input.artifacts] : [],
      figures: Array.isArray(input.figures) ? [...input.figures] : [],
      notes: input.notes?.trim() || "",
      sourceCommit: input.sourceCommit?.trim() || "",
      startedAt: input.startedAt || "",
      completedAt: input.completedAt || "",
      supersedesRunId: input.supersedesRunId || "",
      supersededByRunId: "",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const current = data.peek();
    if (current.experiments.some((item) => item.id === experiment.id)) return null;
    data.value = { ...current, experiments: [...current.experiments, experiment] };
    return experiment;
  };

  const updateExperiment = (experimentId, patch) => {
    const current = data.peek();
    const existing = current.experiments.find((item) => item.id === experimentId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...patch,
      id: existing.id,
      name: patch.name?.trim() || existing.name,
      status: EXPERIMENT_STATUSES.includes(patch.status) ? patch.status : existing.status,
      updatedAt: now(),
    };
    data.value = { ...current, experiments: current.experiments.map((item) => (item.id === experimentId ? updated : item)) };
    return updated;
  };

  const addExperimentMetric = (experimentId, key, value) => {
    if (!key?.trim() || value === undefined || value === null || value === "") return null;
    const experiment = data.peek().experiments.find((item) => item.id === experimentId);
    if (!experiment) return null;
    return updateExperiment(experimentId, { metrics: { ...experiment.metrics, [key.trim()]: value } });
  };

  const addExperimentParameter = (experimentId, key, value) => {
    if (!key?.trim() || value === undefined || value === null || value === "") return null;
    const experiment = data.peek().experiments.find((item) => item.id === experimentId);
    if (!experiment) return null;
    return updateExperiment(experimentId, { parameters: { ...experiment.parameters, [key.trim()]: value } });
  };

  const attachExperimentArtifact = (experimentId, input) => {
    if (!input?.label?.trim()) return null;
    const experiment = data.peek().experiments.find((item) => item.id === experimentId);
    if (!experiment) return null;
    const artifact = {
      id: input.id?.trim() || makeId("artifact"),
      label: input.label.trim(),
      type: input.type?.trim() || "result",
      uri: input.uri?.trim() || "",
      createdAt: now(),
    };
    updateExperiment(experimentId, { artifacts: [...experiment.artifacts, artifact] });
    return artifact;
  };

  const supersedeExperiment = (olderRunId, newerRunId) => {
    const current = data.peek();
    const older = current.experiments.find((item) => item.id === olderRunId);
    const newer = current.experiments.find((item) => item.id === newerRunId);
    if (!older || !newer || older.id === newer.id) return null;
    const timestamp = now();
    const affectedEvidenceIds = new Set(current.evidence.filter((item) => item.experimentId === olderRunId).map((item) => item.id));
    const affectedObjectIds = new Set(current.links.filter((link) => affectedEvidenceIds.has(link.evidenceId)).map((link) => link.objectId));
    data.value = {
      ...current,
      experiments: current.experiments.map((item) => {
        if (item.id === olderRunId) return { ...item, status: "superseded", supersededByRunId: newerRunId, updatedAt: timestamp };
        if (item.id === newerRunId) return { ...item, supersedesRunId: olderRunId, updatedAt: timestamp };
        return item;
      }),
      objects: current.objects.map((object) =>
        affectedObjectIds.has(object.id)
          ? {
              ...object,
              verificationState: "stale",
              verification: {
                outcome: "stale",
                verificationState: "stale",
                reason: `Run ${newerRunId} supersedes the experiment that produced this manuscript evidence.`,
                reasons: [`Run ${newerRunId} supersedes the experiment that produced this manuscript evidence.`],
                checkedAt: timestamp,
                source: "experiment-supersession",
                evidenceReferences: object.verification?.evidenceReferences || [],
              },
              updatedAt: timestamp,
            }
          : object,
      ),
    };
    return {
      older: data.peek().experiments.find((item) => item.id === olderRunId),
      newer: data.peek().experiments.find((item) => item.id === newerRunId),
    };
  };

  const createObject = (selection, requestedKind) => {
    if (!selection?.snippet) return null;
    const existing = findObjectForSelection(selection);
    if (existing) return existing;

    const kind = TRACKABLE_KINDS.has(requestedKind) ? requestedKind : selection.kind === "text" ? "claim" : selection.kind;
    if (!TRACKABLE_KINDS.has(kind)) return null;

    const timestamp = now();
    const object = {
      id: makeId("object"),
      kind,
      subtype: kind === "claim" && hasQuantitativeValue(selection.snippet) ? "quantitative-result" : null,
      text: selection.snippet,
      anchor: {
        from: selection.from,
        to: selection.to,
        line: selection.line,
        sectionTitle: sectionTitle(selection),
        snippet: selection.snippet,
      },
      verificationState: "unlinked",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const current = data.peek();
    data.value = { ...current, objects: [...current.objects, object] };
    return object;
  };

  const updateObject = (objectId, patch) => {
    const current = data.peek();
    const timestamp = now();
    data.value = {
      ...current,
      objects: current.objects.map((object) => (object.id === objectId ? { ...object, ...patch, id: object.id, updatedAt: timestamp } : object)),
    };
  };

  const evidenceForObject = (objectId) => {
    const current = data.value;
    return current.links
      .filter((link) => link.objectId === objectId)
      .map((link) => ({ link, evidence: current.evidence.find((item) => item.id === link.evidenceId) }))
      .filter((entry) => entry.evidence);
  };

  const addEvidence = (objectId, input) => {
    const object = data.peek().objects.find((item) => item.id === objectId);
    if (!object || !input?.label?.trim()) return null;

    const timestamp = now();
    const evidence = {
      id: makeId("evidence"),
      type: EVIDENCE_TYPES.includes(input.type) ? input.type : "other",
      label: input.label.trim(),
      artifactId: input.artifactId?.trim() || "",
      experimentId: input.experimentId?.trim() || "",
      commit: input.commit?.trim() || "",
      metric: input.metric?.trim() || "",
      uri: input.uri?.trim() || "",
      notes: input.notes?.trim() || "",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const link = {
      id: makeId("link"),
      objectId,
      evidenceId: evidence.id,
      relation: PROVENANCE_RELATIONS.includes(input.relation) ? input.relation : "supports",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const current = data.peek();
    data.value = {
      ...current,
      objects: current.objects.map((item) =>
        item.id === objectId && item.verificationState === "unlinked" ? { ...item, verificationState: "needs-review", updatedAt: timestamp } : item,
      ),
      evidence: [...current.evidence, evidence],
      links: [...current.links, link],
    };
    return { evidence, link };
  };

  const addStandaloneEvidence = (input) => {
    if (!input?.label?.trim()) return null;
    const timestamp = now();
    const evidence = {
      id: input.id?.trim() || makeId("evidence"),
      type: EVIDENCE_TYPES.includes(input.type) ? input.type : "experiment-result",
      evidenceKind: input.evidenceKind?.trim() || "quantitative-result",
      label: input.label.trim(),
      artifactId: input.artifactId?.trim() || "",
      experimentId: input.experimentId?.trim() || "",
      commit: input.commit?.trim() || "",
      metric: input.metric?.trim() || "",
      value: input.value ?? "",
      baseline: input.baseline ?? "",
      uri: input.uri?.trim() || "",
      notes: input.notes?.trim() || "",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const current = data.peek();
    if (current.evidence.some((item) => item.id === evidence.id)) return null;
    data.value = { ...current, evidence: [...current.evidence, evidence] };
    return evidence;
  };

  const linkEvidence = (objectId, evidenceId, relation = "supports") => {
    const current = data.peek();
    const object = current.objects.find((item) => item.id === objectId);
    const evidence = current.evidence.find((item) => item.id === evidenceId);
    if (!object || !evidence) return null;
    const existing = current.links.find((link) => link.objectId === objectId && link.evidenceId === evidenceId);
    if (existing) return existing;
    const timestamp = now();
    const link = {
      id: makeId("link"),
      objectId,
      evidenceId,
      relation: PROVENANCE_RELATIONS.includes(relation) ? relation : "supports",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.value = {
      ...current,
      objects: current.objects.map((item) =>
        item.id === objectId && item.verificationState === "unlinked" ? { ...item, verificationState: "needs-review", updatedAt: timestamp } : item,
      ),
      links: [...current.links, link],
    };
    return link;
  };

  const supersedeEvidence = (olderEvidenceId, newerEvidenceId) => {
    const current = data.peek();
    const older = current.evidence.find((item) => item.id === olderEvidenceId);
    const newer = current.evidence.find((item) => item.id === newerEvidenceId);
    if (!older || !newer || older.id === newer.id) return null;
    const timestamp = now();
    const affectedObjectIds = new Set(current.links.filter((link) => link.evidenceId === olderEvidenceId).map((link) => link.objectId));
    data.value = {
      ...current,
      evidence: current.evidence.map((item) => {
        if (item.id === olderEvidenceId) return { ...item, supersededByEvidenceId: newerEvidenceId, updatedAt: timestamp };
        if (item.id === newerEvidenceId) return { ...item, supersedesEvidenceId: olderEvidenceId, updatedAt: timestamp };
        return item;
      }),
      links: current.links.map((link) =>
        link.evidenceId === olderEvidenceId ? { ...link, evidenceId: newerEvidenceId, updatedAt: timestamp } : link,
      ),
      objects: current.objects.map((object) =>
        affectedObjectIds.has(object.id) ? { ...object, verificationState: "stale", updatedAt: timestamp } : object,
      ),
    };
    return newer;
  };

  const updateEvidence = (evidenceId, patch) => {
    const current = data.peek();
    const timestamp = now();
    const affectedObjectIds = new Set(current.links.filter((link) => link.evidenceId === evidenceId).map((link) => link.objectId));
    data.value = {
      ...current,
      objects: current.objects.map((object) =>
        affectedObjectIds.has(object.id) && object.verificationState === "verified"
          ? {
              ...object,
              verificationState: "stale",
              verification: {
                outcome: "stale",
                verificationState: "stale",
                reason: "Linked evidence changed after this object was verified.",
                reasons: ["Linked evidence changed after this object was verified."],
                checkedAt: timestamp,
                source: "evidence-update",
                evidenceReferences: object.verification?.evidenceReferences || [],
              },
              updatedAt: timestamp,
            }
          : object,
      ),
      evidence: current.evidence.map((evidence) =>
        evidence.id === evidenceId
          ? {
              ...evidence,
              ...patch,
              id: evidence.id,
              label: patch.label?.trim() || evidence.label,
              updatedAt: timestamp,
            }
          : evidence,
      ),
    };
  };

  const recordVerification = (objectId, verification) => {
    const current = data.peek();
    const object = current.objects.find((item) => item.id === objectId);
    if (!object || !verification?.verificationState) return null;
    const timestamp = now();
    const record = { ...verification, checkedAt: verification.checkedAt || timestamp };
    const updated = {
      ...object,
      verificationState: record.verificationState,
      verification: record,
      verificationHistory: [...(object.verificationHistory || []), record].slice(-20),
      updatedAt: timestamp,
    };
    data.value = { ...current, objects: current.objects.map((item) => (item.id === objectId ? updated : item)) };
    return updated;
  };

  const reviewResearchDiff = (diffId, status, details = {}) => {
    if (!diffId || !["pending", "in-review", "rejected", "deferred", "reconciled"].includes(status)) return null;
    const current = data.peek();
    const review = { ...(current.diffReviews?.[diffId] || {}), ...details, status, updatedAt: now() };
    data.value = { ...current, diffReviews: { ...(current.diffReviews || {}), [diffId]: review } };
    return review;
  };

  const reconcileResearchDiff = (diffId, objectId, text, anchor, evidenceReferences = []) => {
    const current = data.peek();
    const object = current.objects.find((item) => item.id === objectId);
    if (!object || !text || !anchor) return null;
    const timestamp = now();
    const record = {
      outcome: "verified",
      verificationState: "verified",
      reason: "The researcher accepted the evidence-backed manuscript update through the visible review controls.",
      reasons: ["The researcher accepted the evidence-backed manuscript update through the visible review controls."],
      checkedAt: timestamp,
      source: "research-diff-reconciliation",
      evidenceReferences,
    };
    const updatedObject = {
      ...object,
      text,
      anchor: { ...object.anchor, ...anchor, snippet: text },
      verificationState: "verified",
      verification: record,
      verificationHistory: [...(object.verificationHistory || []), record].slice(-20),
      updatedAt: timestamp,
    };
    const review = { ...(current.diffReviews?.[diffId] || {}), status: "reconciled", updatedAt: timestamp };
    data.value = {
      ...current,
      objects: current.objects.map((item) => (item.id === objectId ? updatedObject : item)),
      diffReviews: { ...(current.diffReviews || {}), [diffId]: review },
    };
    return updatedObject;
  };

  const updateLink = (linkId, patch) => {
    const current = data.peek();
    const timestamp = now();
    data.value = {
      ...current,
      links: current.links.map((link) =>
        link.id === linkId
          ? {
              ...link,
              ...patch,
              id: link.id,
              relation: PROVENANCE_RELATIONS.includes(patch.relation) ? patch.relation : link.relation,
              updatedAt: timestamp,
            }
          : link,
      ),
    };
  };

  const removeEvidence = (evidenceId) => {
    const current = data.peek();
    const removedLinks = current.links.filter((link) => link.evidenceId === evidenceId);
    const affectedObjectIds = new Set(removedLinks.map((link) => link.objectId));
    const remainingLinks = current.links.filter((link) => link.evidenceId !== evidenceId);
    const timestamp = now();

    data.value = {
      ...current,
      evidence: current.evidence.filter((evidence) => evidence.id !== evidenceId),
      links: remainingLinks,
      objects: current.objects.map((object) =>
        affectedObjectIds.has(object.id) && !remainingLinks.some((link) => link.objectId === object.id)
          ? { ...object, verificationState: "unlinked", updatedAt: timestamp }
          : object,
      ),
    };
  };

  const removeObject = (objectId) => {
    const current = data.peek();
    const removedEvidenceIds = new Set(current.links.filter((link) => link.objectId === objectId).map((link) => link.evidenceId));
    const remainingLinks = current.links.filter((link) => link.objectId !== objectId);
    const stillReferencedEvidenceIds = new Set(remainingLinks.map((link) => link.evidenceId));
    data.value = {
      ...current,
      objects: current.objects.filter((object) => object.id !== objectId),
      links: remainingLinks,
      evidence: current.evidence.filter((evidence) => !removedEvidenceIds.has(evidence.id) || stillReferencedEvidenceIds.has(evidence.id)),
    };
  };

  const stats = () => {
    const current = data.value;
    const linkedObjectIds = new Set(current.links.map((link) => link.objectId));
    const stateCounts = Object.fromEntries(VERIFICATION_STATES.map((state) => [state, 0]));
    current.objects.forEach((object) => {
      if (object.verificationState in stateCounts) stateCounts[object.verificationState] += 1;
    });
    return {
      experimentCount: current.experiments.length,
      objectCount: current.objects.length,
      linkedObjectCount: linkedObjectIds.size,
      evidenceCount: current.evidence.length,
      stateCounts,
    };
  };

  const replaceData = (nextData) => {
    if (!nextData || !Array.isArray(nextData.objects) || !Array.isArray(nextData.evidence) || !Array.isArray(nextData.links)) return false;
    data.value = {
      version: 2,
      experiments: Array.isArray(nextData.experiments) ? nextData.experiments : [],
      objects: nextData.objects,
      evidence: nextData.evidence,
      links: nextData.links,
      diffReviews: nextData.diffReviews || {},
    };
    return true;
  };

  return {
    data,
    xrayActive,
    storageKey,
    cleanup: persistenceCleanup,
    findObjectForSelection,
    createExperiment,
    updateExperiment,
    addExperimentMetric,
    addExperimentParameter,
    attachExperimentArtifact,
    supersedeExperiment,
    createObject,
    updateObject,
    removeObject,
    evidenceForObject,
    addEvidence,
    addStandaloneEvidence,
    linkEvidence,
    supersedeEvidence,
    updateEvidence,
    updateLink,
    removeEvidence,
    recordVerification,
    reviewResearchDiff,
    reconcileResearchDiff,
    replaceData,
    stats,
  };
}

export function ensureProvenanceStore(editorState) {
  if (editorState.provenance) return editorState.provenance;
  const store = createProvenanceStore(editorState.options.id.value);
  editorState.provenance = store;
  editorState.cleanups.push(store.cleanup);
  const xrayCleanup = effect(() => refreshXray(editorState.editorView.value, store.xrayActive.value, store.data.value.objects));
  editorState.cleanups.push(xrayCleanup);
  return store;
}
