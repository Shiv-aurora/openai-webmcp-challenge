import { effect, signal } from "@preact/signals";

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

const TRACKABLE_KINDS = new Set(["claim", "method", "figure", "table"]);

const now = () => new Date().toISOString();
const makeId = (prefix) => `${prefix}-${crypto.randomUUID()}`;
const cloneEmptyData = () => ({ version: 1, objects: [], evidence: [], links: [] });

function safeLoad(storageKey) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey));
    if (!parsed || parsed.version !== 1) return cloneEmptyData();
    return {
      version: 1,
      objects: Array.isArray(parsed.objects) ? parsed.objects : [],
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
      links: Array.isArray(parsed.links) ? parsed.links : [],
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
  const persistenceCleanup = effect(() => safeSave(storageKey, data.value));

  const findObjectForSelection = (selection) => {
    if (!selection?.snippet) return null;
    const objects = data.value.objects;
    const exactRange = objects.find(
      (object) => object.anchor.from === selection.from && object.anchor.to === selection.to && object.anchor.sectionTitle === sectionTitle(selection),
    );
    if (exactRange) return exactRange;
    return (
      objects.find(
        (object) => object.anchor.snippet === selection.snippet && object.anchor.sectionTitle === sectionTitle(selection),
      ) || null
    );
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
        item.id === objectId && item.verificationState === "unlinked"
          ? { ...item, verificationState: "needs-review", updatedAt: timestamp }
          : item,
      ),
      evidence: [...current.evidence, evidence],
      links: [...current.links, link],
    };
    return { evidence, link };
  };

  const updateEvidence = (evidenceId, patch) => {
    const current = data.peek();
    const timestamp = now();
    data.value = {
      ...current,
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
    return {
      objectCount: current.objects.length,
      linkedObjectCount: linkedObjectIds.size,
      evidenceCount: current.evidence.length,
    };
  };

  return {
    data,
    storageKey,
    cleanup: persistenceCleanup,
    findObjectForSelection,
    createObject,
    updateObject,
    removeObject,
    evidenceForObject,
    addEvidence,
    updateEvidence,
    updateLink,
    removeEvidence,
    stats,
  };
}

export function ensureProvenanceStore(editorState) {
  if (editorState.provenance) return editorState.provenance;
  const store = createProvenanceStore(editorState.options.id.value);
  editorState.provenance = store;
  editorState.cleanups.push(store.cleanup);
  return store;
}
