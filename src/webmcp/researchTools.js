import { manuscriptStats } from "../integrity/selection";
import { ensureProvenanceStore, VERIFICATION_STATES } from "../integrity/provenance";

export const READ_ONLY_WEBMCP_TOOL_NAMES = [
  "get_current_selection",
  "get_manuscript_context",
  "get_claim",
  "get_figure",
  "get_table",
  "get_current_section",
  "get_provenance",
  "get_integrity_status",
  "get_navigation_targets",
];

const readSignal = (value) => (typeof value?.peek === "function" ? value.peek() : value?.value);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const copySection = (section) =>
  section
    ? {
        title: section.title,
        level: section.level,
        line: section.line,
        from: section.from,
        to: section.to,
      }
    : null;

const toolResult = (payload, isError = false) => ({
  content: [{ type: "text", text: JSON.stringify(payload) }],
  structuredContent: payload,
  ...(isError ? { isError: true } : {}),
});

const toolError = (code, message, details = {}) => toolResult({ ok: false, error: { code, message, ...details } }, true);

const sectionText = (markdown, section) => {
  const source = typeof markdown === "string" ? markdown : "";
  const lines = source.split("\n");
  const offsets = [];
  let offset = 0;
  for (const line of lines) {
    offsets.push(offset);
    offset += line.length + 1;
  }

  if (!section) {
    const firstHeading = lines.findIndex((line) => /^#{1,6}\s+/.test(line));
    const end = firstHeading < 0 ? source.length : offsets[firstHeading];
    return { from: 0, to: end, text: source.slice(0, end).trim() };
  }

  const startLineIndex = Math.max(0, section.line - 1);
  let endLineIndex = lines.length;
  for (let index = startLineIndex + 1; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{1,6})\s+/);
    if (match && match[1].length <= section.level) {
      endLineIndex = index;
      break;
    }
  }

  const from = offsets[startLineIndex] ?? 0;
  const to = endLineIndex >= lines.length ? source.length : offsets[endLineIndex];
  return { from, to, text: source.slice(from, to).trim() };
};

const selectionSnapshot = (editorState, provenance) => {
  const selection = readSignal(editorState.manuscriptSelection) || {};
  const trackedObject = provenance.findObjectForSelection(selection);
  return {
    kind: selection.kind || "none",
    from: selection.from ?? 0,
    to: selection.to ?? 0,
    line: selection.line ?? 1,
    section: copySection(selection.section),
    snippet: selection.snippet || "",
    hasSelection: Boolean(selection.hasSelection),
    verificationState: trackedObject?.verificationState || selection.verificationState || "context-only",
    trackedObjectId: trackedObject?.id || null,
  };
};

const contextSnapshot = (editorState, provenance, input = {}) => {
  const markdown = readSignal(editorState.text?.text) || "";
  const selection = selectionSnapshot(editorState, provenance);
  const scope = ["selection", "section", "manuscript"].includes(input.scope) ? input.scope : "section";
  const maxChars = clamp(Number.isFinite(input.maxChars) ? input.maxChars : 4000, 256, 20000);

  let range = { from: 0, to: markdown.length, text: markdown };
  if (scope === "selection") {
    range = { from: selection.from, to: selection.to, text: markdown.slice(selection.from, selection.to) || selection.snippet };
  } else if (scope === "section") {
    range = sectionText(markdown, selection.section);
  }

  const truncated = range.text.length > maxChars;
  const content = truncated ? range.text.slice(0, maxChars) : range.text;

  return {
    ok: true,
    editor: {
      id: readSignal(editorState.options.id),
      title: readSignal(editorState.options.title) || "",
    },
    scope,
    selection,
    document: {
      ...manuscriptStats(markdown),
      characterCount: markdown.length,
    },
    integrity: provenance.stats(),
    context: {
      from: range.from,
      to: range.to,
      content,
      truncated,
      totalCharacters: range.text.length,
    },
  };
};

const resolveObject = (editorState, provenance, objectId) => {
  if (objectId) return readSignal(provenance.data)?.objects.find((object) => object.id === objectId) || null;
  return provenance.findObjectForSelection(readSignal(editorState.manuscriptSelection));
};

const untrackedObjectFromSelection = (selection, kind) => ({
  id: null,
  kind,
  subtype: kind === "claim" && /(?:\d+(?:\.\d+)?\s*%|\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)/i.test(selection.snippet || "") ? "quantitative-result" : null,
  text: selection.snippet,
  anchor: {
    from: selection.from,
    to: selection.to,
    line: selection.line,
    sectionTitle: selection.section?.title || "Front matter",
    snippet: selection.snippet,
  },
  verificationState: selection.verificationState || "unlinked",
});

const trackedKindSnapshot = (editorState, provenance, input, { kind, idKey, notFoundCode, noSelectionCode, label }) => {
  const selection = selectionSnapshot(editorState, provenance);
  const requestedId = input[idKey];
  const requestedObject = requestedId ? resolveObject(editorState, provenance, requestedId) : null;
  const selectedObject = requestedId ? requestedObject : resolveObject(editorState, provenance);

  if (requestedId && (!requestedObject || requestedObject.kind !== kind)) {
    return toolError(notFoundCode, `No tracked ${label} exists with the requested ${idKey}.`, { [idKey]: requestedId });
  }

  if (selectedObject?.kind === kind) {
    return toolResult({
      ok: true,
      tracked: true,
      [kind]: selectedObject,
      evidence: provenance.evidenceForObject(selectedObject.id),
      selection,
    });
  }

  if (!requestedId && selection.kind === kind && selection.snippet) {
    return toolResult({
      ok: true,
      tracked: false,
      [kind]: untrackedObjectFromSelection(selection, kind),
      evidence: [],
      selection,
    });
  }

  return toolError(noSelectionCode, `Select a ${label} in the manuscript or provide a tracked ${idKey}.`);
};

const claimSnapshot = (editorState, provenance, input = {}) =>
  trackedKindSnapshot(editorState, provenance, input, {
    kind: "claim",
    idKey: "claimId",
    notFoundCode: "CLAIM_NOT_FOUND",
    noSelectionCode: "NO_CLAIM_SELECTED",
    label: "claim",
  });

const figureSnapshot = (editorState, provenance, input = {}) =>
  trackedKindSnapshot(editorState, provenance, input, {
    kind: "figure",
    idKey: "figureId",
    notFoundCode: "FIGURE_NOT_FOUND",
    noSelectionCode: "NO_FIGURE_SELECTED",
    label: "figure",
  });

const tableSnapshot = (editorState, provenance, input = {}) =>
  trackedKindSnapshot(editorState, provenance, input, {
    kind: "table",
    idKey: "tableId",
    notFoundCode: "TABLE_NOT_FOUND",
    noSelectionCode: "NO_TABLE_SELECTED",
    label: "table",
  });

const currentSectionSnapshot = (editorState, provenance) => {
  const selection = selectionSnapshot(editorState, provenance);
  if (!selection.section) return toolError("NO_SECTION_CONTEXT", "The current manuscript selection is not inside a named section.");

  const markdown = readSignal(editorState.text?.text) || "";
  const range = sectionText(markdown, selection.section);
  return toolResult({
    ok: true,
    section: selection.section,
    selection,
    context: {
      from: range.from,
      to: range.to,
      content: range.text,
      totalCharacters: range.text.length,
    },
  });
};

const provenanceSnapshot = (editorState, provenance, input = {}) => {
  const object = resolveObject(editorState, provenance, input.objectId);
  if (!object) {
    return toolError("PROVENANCE_NOT_FOUND", "Select a tracked manuscript object or provide a valid objectId.", {
      objectId: input.objectId || null,
    });
  }

  return toolResult({
    ok: true,
    object,
    evidence: provenance.evidenceForObject(object.id),
    integrity: provenance.stats(),
    selection: selectionSnapshot(editorState, provenance),
  });
};

const objectSummary = (provenance, object) => ({
  id: object.id,
  kind: object.kind,
  subtype: object.subtype || null,
  text: object.text,
  anchor: object.anchor,
  verificationState: object.verificationState,
  evidenceCount: provenance.evidenceForObject(object.id).length,
  updatedAt: object.updatedAt,
});

const integrityStatusSnapshot = (provenance, input = {}) => {
  const data = readSignal(provenance.data) || { objects: [] };
  const limit = clamp(Number.isFinite(input.limit) ? input.limit : 50, 1, 100);
  const includeObjects = input.includeObjects !== false;
  const objects = includeObjects ? data.objects.slice(0, limit).map((object) => objectSummary(provenance, object)) : [];

  return toolResult({
    ok: true,
    integrity: provenance.stats(),
    objects,
    returnedObjectCount: objects.length,
    totalObjectCount: data.objects.length,
    truncated: includeObjects && data.objects.length > objects.length,
  });
};

const navigationTargetsSnapshot = (provenance, input = {}) => {
  const data = readSignal(provenance.data) || { objects: [] };
  const limit = clamp(Number.isFinite(input.limit) ? input.limit : 50, 1, 100);
  const targets = data.objects
    .filter((object) => !input.kind || object.kind === input.kind)
    .filter((object) => !input.verificationState || object.verificationState === input.verificationState)
    .sort((left, right) => (left.anchor?.from ?? 0) - (right.anchor?.from ?? 0))
    .slice(0, limit)
    .map((object) => objectSummary(provenance, object));

  const totalMatchingTargets = data.objects.filter(
    (object) => (!input.kind || object.kind === input.kind) && (!input.verificationState || object.verificationState === input.verificationState),
  ).length;

  return toolResult({
    ok: true,
    targets,
    returnedTargetCount: targets.length,
    totalMatchingTargets,
    truncated: totalMatchingTargets > targets.length,
  });
};

export function buildResearchWebMCPTools(editorState) {
  const provenance = ensureProvenanceStore(editorState);
  const noInputSchema = { type: "object", properties: {}, additionalProperties: false };
  const readOnlyAnnotations = { readOnlyHint: true, untrustedContentHint: true };
  const objectIdSchema = (idKey, label) => ({
    type: "object",
    properties: {
      [idKey]: { type: "string", description: `Optional tracked ${label} id. Omit it to use the current manuscript selection.` },
    },
    additionalProperties: false,
  });

  return [
    {
      name: "get_current_selection",
      title: "Get current manuscript selection",
      description: "Return the researcher's live manuscript selection, section, object kind, and verification state without changing the document.",
      inputSchema: noInputSchema,
      annotations: readOnlyAnnotations,
      execute: async () => toolResult({ ok: true, selection: selectionSnapshot(editorState, provenance) }),
    },
    {
      name: "get_manuscript_context",
      title: "Get manuscript context",
      description: "Return live manuscript text and integrity context for the current selection, current section, or manuscript.",
      inputSchema: {
        type: "object",
        properties: {
          scope: {
            type: "string",
            enum: ["selection", "section", "manuscript"],
            description: "Context scope. Defaults to the current section.",
          },
          maxChars: {
            type: "integer",
            minimum: 256,
            maximum: 20000,
            description: "Maximum manuscript characters to return. Defaults to 4000.",
          },
        },
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: async (input = {}) => toolResult(contextSnapshot(editorState, provenance, input)),
    },
    {
      name: "get_claim",
      title: "Get claim",
      description: "Return the currently selected claim, or a tracked claim by id, including its verification state and linked evidence.",
      inputSchema: objectIdSchema("claimId", "claim"),
      annotations: readOnlyAnnotations,
      execute: async (input = {}) => claimSnapshot(editorState, provenance, input),
    },
    {
      name: "get_figure",
      title: "Get figure",
      description: "Return the currently selected figure, or a tracked figure by id, including its verification state and linked evidence.",
      inputSchema: objectIdSchema("figureId", "figure"),
      annotations: readOnlyAnnotations,
      execute: async (input = {}) => figureSnapshot(editorState, provenance, input),
    },
    {
      name: "get_table",
      title: "Get table",
      description: "Return the currently selected table, or a tracked table by id, including its verification state and linked evidence.",
      inputSchema: objectIdSchema("tableId", "table"),
      annotations: readOnlyAnnotations,
      execute: async (input = {}) => tableSnapshot(editorState, provenance, input),
    },
    {
      name: "get_current_section",
      title: "Get current section",
      description: "Return the named manuscript section containing the researcher's current selection together with that section's live text.",
      inputSchema: noInputSchema,
      annotations: readOnlyAnnotations,
      execute: async () => currentSectionSnapshot(editorState, provenance),
    },
    {
      name: "get_provenance",
      title: "Get provenance",
      description: "Return provenance and linked evidence for the currently selected tracked manuscript object, or for an explicit object id.",
      inputSchema: objectIdSchema("objectId", "manuscript object"),
      annotations: readOnlyAnnotations,
      execute: async (input = {}) => provenanceSnapshot(editorState, provenance, input),
    },
    {
      name: "get_integrity_status",
      title: "Get manuscript integrity status",
      description: "Return live manuscript integrity counts and optional summaries of tracked provenance objects without changing researcher state.",
      inputSchema: {
        type: "object",
        properties: {
          includeObjects: { type: "boolean", description: "Include tracked object summaries. Defaults to true." },
          limit: { type: "integer", minimum: 1, maximum: 100, description: "Maximum tracked object summaries to return. Defaults to 50." },
        },
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: async (input = {}) => integrityStatusSnapshot(provenance, input),
    },
    {
      name: "get_navigation_targets",
      title: "Get manuscript navigation targets",
      description:
        "List tracked manuscript objects that an agent may ask the researcher to inspect or navigate to, optionally filtered by object kind or verification state.",
      inputSchema: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["claim", "method", "figure", "table"], description: "Optional manuscript object kind filter." },
          verificationState: { type: "string", enum: VERIFICATION_STATES, description: "Optional verification-state filter." },
          limit: { type: "integer", minimum: 1, maximum: 100, description: "Maximum navigation targets to return. Defaults to 50." },
        },
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: async (input = {}) => navigationTargetsSnapshot(provenance, input),
    },
  ];
}
