import { extractComparableValues } from "./verification";

export const RESEARCH_DIFF_STATUSES = ["pending", "in-review", "rejected", "deferred", "reconciled"];

const sameValue = (left, right) => left?.unit === right?.unit && Math.abs(left.value - right.value) <= Math.max(1e-12, Math.abs(left.value) * 1e-9);

const linkedEvidence = (data, objectId) =>
  data.links
    .filter((link) => link.objectId === objectId)
    .map((link) => ({ link, evidence: data.evidence.find((evidence) => evidence.id === link.evidenceId) }))
    .filter((entry) => entry.evidence);

const currentReference = ({ link, evidence }) => ({
  evidenceId: evidence.id,
  label: evidence.label,
  relation: link.relation,
  artifactId: evidence.artifactId || "",
  experimentId: evidence.experimentId || "",
  commit: evidence.commit || "",
  metric: evidence.metric || "",
  uri: evidence.uri || "",
  updatedAt: evidence.updatedAt,
});

const changedReferenceFields = (previous, current) =>
  ["artifactId", "experimentId", "commit", "metric", "uri"].filter(
    (field) => previous?.[field] && current?.[field] && previous[field] !== current[field],
  );

const replaceValue = (text, previous, next) => {
  const index = text.lastIndexOf(previous.raw);
  if (index < 0) return null;
  return `${text.slice(0, index)}${next.raw}${text.slice(index + previous.raw.length)}`;
};

const figureUri = (text) => text.match(/!\[[^\]]*\]\(([^)]+)\)/)?.[1] || "";

function changesForObject(object, evidenceEntries) {
  const changes = [];
  let proposedText = null;
  const manuscriptValues = extractComparableValues(object.text);
  const previousReferences = object.verification?.evidenceReferences || [];
  const currentReferences = evidenceEntries.map(currentReference);
  const referenceHasChanged = currentReferences.some((current) => {
    const previous = previousReferences.find((reference) => reference.evidenceId === current.evidenceId);
    return !previous || changedReferenceFields(previous, current).length > 0;
  });
  const evidenceValues = evidenceEntries.flatMap((entry) =>
    extractComparableValues(entry.evidence.metric).map((value) => ({ value, evidenceId: entry.evidence.id, label: entry.evidence.label })),
  );

  if (
    ["claim", "method", "table"].includes(object.kind) &&
    evidenceValues.length &&
    (referenceHasChanged || ["stale", "contradicted"].includes(object.verificationState))
  ) {
    const researchValues = evidenceValues.map((entry) => entry.value);
    const matched = researchValues.every((researchValue) => manuscriptValues.some((manuscriptValue) => sameValue(manuscriptValue, researchValue)));
    if (!matched) {
      const unmatchedManuscript = manuscriptValues.filter(
        (manuscriptValue) => !researchValues.some((researchValue) => sameValue(manuscriptValue, researchValue)),
      );
      const unmatchedResearch = researchValues.filter(
        (researchValue) => !manuscriptValues.some((manuscriptValue) => sameValue(manuscriptValue, researchValue)),
      );
      const before = unmatchedManuscript.at(-1) || manuscriptValues.at(-1);
      const after = unmatchedResearch.length === 1 ? unmatchedResearch[0] : researchValues.length === 1 ? researchValues[0] : null;
      changes.push({
        kind: object.kind === "method" ? "methodology" : object.kind === "table" ? "table-values" : "quantitative-result",
        label: object.kind === "method" ? "Method configuration changed" : object.kind === "table" ? "Table results changed" : "Result value changed",
        before: before?.raw || object.text,
        after:
          after?.raw ||
          evidenceEntries
            .map((entry) => entry.evidence.metric)
            .filter(Boolean)
            .join("; "),
      });
      if (before && after) proposedText = replaceValue(object.text, before, after);
    }
  }

  if (object.kind === "figure") {
    const manuscriptUri = figureUri(object.text);
    const currentUri = evidenceEntries.find((entry) => entry.evidence.uri)?.evidence.uri || "";
    if (manuscriptUri && currentUri && manuscriptUri !== currentUri) {
      changes.push({ kind: "figure", label: "Figure source changed", before: manuscriptUri, after: currentUri });
      proposedText = object.text.replace(manuscriptUri, currentUri);
    }
  }

  for (const current of currentReferences) {
    const previous = previousReferences.find((reference) => reference.evidenceId === current.evidenceId);
    const fields = changedReferenceFields(previous, current);
    if (!fields.length) continue;
    changes.push({
      kind: "artifact",
      label: `Linked artifact changed (${fields.join(", ")})`,
      before: fields.map((field) => `${field}: ${previous[field]}`).join(" · "),
      after: fields.map((field) => `${field}: ${current[field]}`).join(" · "),
    });
  }

  if (!changes.length && ["stale", "contradicted"].includes(object.verificationState)) {
    changes.push({
      kind: "integrity-state",
      label: object.verificationState === "stale" ? "Linked research changed" : "Evidence contradicts manuscript state",
      before: object.text,
      after: evidenceEntries.map((entry) => entry.evidence.metric || entry.evidence.uri || entry.evidence.label).join(" · "),
    });
  }

  return { changes, proposedText, currentReferences };
}

export function detectResearchDiffs(data) {
  const safeData = data || { objects: [], evidence: [], links: [], diffReviews: {} };
  return safeData.objects
    .map((object) => {
      const evidenceEntries = linkedEvidence(safeData, object.id);
      if (!evidenceEntries.length) return null;
      const { changes, proposedText, currentReferences } = changesForObject(object, evidenceEntries);
      if (!changes.length) return null;
      const id = `research-diff-${object.id}`;
      const review = safeData.diffReviews?.[id] || { status: "pending" };
      return {
        id,
        objectId: object.id,
        objectKind: object.kind,
        group: object.anchor?.sectionTitle || "Front matter",
        manuscriptText: object.text,
        proposedText,
        changes,
        evidenceReferences: currentReferences,
        status: review.status,
        review,
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftObject = safeData.objects.find((object) => object.id === left.objectId);
      const rightObject = safeData.objects.find((object) => object.id === right.objectId);
      return (leftObject?.anchor?.from || 0) - (rightObject?.anchor?.from || 0);
    });
}

export function groupResearchDiffs(diffs) {
  return diffs.reduce((groups, diff) => {
    const current = groups.find((group) => group.title === diff.group);
    if (current) current.diffs.push(diff);
    else groups.push({ title: diff.group, diffs: [diff] });
    return groups;
  }, []);
}
