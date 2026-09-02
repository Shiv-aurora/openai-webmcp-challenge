import { manuscriptStats } from "../integrity/selection";
import { ensureProvenanceStore } from "../integrity/provenance";

export const READ_ONLY_WEBMCP_TOOL_NAMES = ["get_current_selection", "get_manuscript_context", "get_claim", "get_provenance"];

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

const claimSnapshot = (editorState, provenance, input = {}) => {
  const selection = selectionSnapshot(editorState, provenance);
  const requestedClaim = input.claimId ? resolveObject(editorState, provenance, input.claimId) : null;
  const selectedObject = input.claimId ? requestedClaim : resolveObject(editorState, provenance);

  if (input.claimId && (!requestedClaim || requestedClaim.kind !== "claim")) {
    return toolError("CLAIM_NOT_FOUND", "No tracked claim exists with the requested claimId.", { claimId: input.claimId });
  }

  if (selectedObject?.kind === "claim") {
    return toolResult({
      ok: true,
      tracked: true,
      claim: selectedObject,
      evidence: provenance.evidenceForObject(selectedObject.id),
      selection,
    });
  }

  if (!input.claimId && selection.kind === "claim" && selection.snippet) {
    return toolResult({
      ok: true,
      tracked: false,
      claim: {
        id: null,
        kind: "claim",
        text: selection.snippet,
        anchor: {
          from: selection.from,
          to: selection.to,
          line: selection.line,
          sectionTitle: selection.section?.title || "Front matter",
          snippet: selection.snippet,
        },
        verificationState: selection.verificationState,
      },
      evidence: [],
      selection,
    });
  }

  return toolError("NO_CLAIM_SELECTED", "Select a claim in the manuscript or provide a tracked claimId.");
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

export function buildResearchWebMCPTools(editorState) {
  const provenance = ensureProvenanceStore(editorState);
  const noInputSchema = { type: "object", properties: {}, additionalProperties: false };
  const readOnlyAnnotations = { readOnlyHint: true, untrustedContentHint: true };

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
      inputSchema: {
        type: "object",
        properties: {
          claimId: { type: "string", description: "Optional tracked claim id. Omit it to use the current manuscript selection." },
        },
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: async (input = {}) => claimSnapshot(editorState, provenance, input),
    },
    {
      name: "get_provenance",
      title: "Get provenance",
      description: "Return provenance and linked evidence for the currently selected tracked manuscript object, or for an explicit object id.",
      inputSchema: {
        type: "object",
        properties: {
          objectId: { type: "string", description: "Optional tracked manuscript object id. Omit it to use the current manuscript selection." },
        },
        additionalProperties: false,
      },
      annotations: readOnlyAnnotations,
      execute: async (input = {}) => provenanceSnapshot(editorState, provenance, input),
    },
  ];
}
