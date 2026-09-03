import { Compartment, StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView } from "@codemirror/view";

export const xrayCompartment = new Compartment();
export const setXrayDecorations = StateEffect.define();

export const xrayField = StateField.define({
  create: () => Decoration.set([]),
  update(decorations, transaction) {
    let next = decorations.map(transaction.changes);
    for (const effect of transaction.effects) {
      if (effect.is(setXrayDecorations)) next = effect.value;
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

const statusClasses = {
  verified: "cm-xray-verified",
  "needs-review": "cm-xray-needs-review",
  stale: "cm-xray-stale",
  contradicted: "cm-xray-contradicted",
  unlinked: "cm-xray-unlinked",
};

export function resolveXrayRange(doc, object) {
  if (!doc || !object?.anchor) return null;
  const from = Math.max(0, Math.min(object.anchor.from ?? 0, doc.length));
  const to = Math.max(from, Math.min(object.anchor.to ?? from, doc.length));
  const snippet = object.anchor.snippet?.trim();

  if (to > from) {
    const current = doc.sliceString(from, to);
    if (!snippet || current.includes(snippet) || snippet.includes(current.trim())) return { from, to };
  }

  if (snippet) {
    const found = doc.toString().indexOf(snippet);
    if (found >= 0) return { from: found, to: found + snippet.length };
  }

  return to > from ? { from, to } : null;
}

export function buildXrayDecorations(objects, doc) {
  if (!doc || !objects?.length) return Decoration.set([]);

  const ranges = objects
    .map((object) => {
      const range = resolveXrayRange(doc, object);
      const statusClass = statusClasses[object.verificationState];
      if (!range || !statusClass) return null;
      return Decoration.mark({
        class: `cm-xray-object ${statusClass}`,
        attributes: {
          "data-xray-object-id": object.id,
          "data-xray-state": object.verificationState,
          title: `Research X-Ray: ${object.verificationState.replaceAll("-", " ")}`,
        },
      }).range(range.from, range.to);
    })
    .filter(Boolean)
    .sort((left, right) => left.from - right.from || left.to - right.to);

  return Decoration.set(ranges, true);
}

const displayState = (state = "unlinked") => state.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());

export function describeXrayObject(object, data = {}) {
  const evidenceById = new Map((data.evidence || []).map((item) => [item.id, item]));
  const experimentById = new Map((data.experiments || []).map((item) => [item.id, item]));
  const linkedIds = (data.links || []).filter((link) => link.objectId === object.id).map((link) => link.evidenceId);
  const referenceIds = (object.verification?.evidenceReferences || []).map((reference) => reference.evidenceId);
  const evidenceIds = [...new Set([...linkedIds, ...referenceIds])];
  const lines = [`${displayState(object.verificationState)} · ${object.kind || "claim"}`];
  if (object.verification?.reason) lines.push(object.verification.reason);

  for (const evidenceId of evidenceIds) {
    const evidence = evidenceById.get(evidenceId);
    const reference = object.verification?.evidenceReferences?.find((item) => item.evidenceId === evidenceId);
    const experimentId = reference?.experimentId || evidence?.experimentId;
    const experiment = experimentById.get(experimentId);
    lines.push(`Evidence: ${evidence?.label || reference?.label || evidenceId}`);
    if (experiment?.name || experimentId) lines.push(`Run: ${experiment?.name || experimentId}`);
    if (reference?.metric || evidence?.metric) lines.push(`Metric: ${reference?.metric || evidence.metric}`);
    if (reference?.artifactId || evidence?.artifactId) lines.push(`Artifact: ${reference?.artifactId || evidence.artifactId}`);
    if (reference?.commit || evidence?.commit || experiment?.sourceCommit) {
      lines.push(`Commit: ${reference?.commit || evidence?.commit || experiment?.sourceCommit}`);
    }
  }
  if (!evidenceIds.length) lines.push("Evidence: none linked");
  return lines.join("\n");
}

export function buildDetailedXrayDecorations(data, doc) {
  const objects = Array.isArray(data) ? data : data?.objects;
  if (!doc || !objects?.length) return Decoration.set([]);
  const context = Array.isArray(data) ? { objects } : data;
  const ranges = objects
    .map((object) => {
      const range = resolveXrayRange(doc, object);
      const statusClass = statusClasses[object.verificationState];
      if (!range || !statusClass) return null;
      const description = describeXrayObject(object, context);
      return Decoration.mark({
        class: `cm-xray-object ${statusClass}`,
        attributes: {
          "data-xray-object-id": object.id,
          "data-xray-state": object.verificationState,
          "data-xray-details": description,
          "aria-label": description,
          title: description,
        },
      }).range(range.from, range.to);
    })
    .filter(Boolean)
    .sort((left, right) => left.from - right.from || left.to - right.to);
  return Decoration.set(ranges, true);
}

export function refreshXray(view, active, data) {
  if (!view?.dispatch) return;
  const decorations = active ? buildDetailedXrayDecorations(data, view.state.doc) : Decoration.set([]);
  view.dispatch({ effects: setXrayDecorations.of(decorations) });
}
