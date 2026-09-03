import { deriveManuscriptSelection } from "../integrity/selection";
import { EVIDENCE_TYPES, PROVENANCE_RELATIONS, VERIFICATION_STATES, ensureProvenanceStore } from "../integrity/provenance";
import { detectResearchDiffs } from "../integrity/researchDiff";
import { VERIFICATION_OUTCOMES, normalizeAgentVerification, verifyQuantitativeClaim } from "../integrity/verification";
import { resolveXrayRange } from "../integrity/xray";

export const ACTION_WEBMCP_TOOL_NAMES = [
  "create_claim",
  "attach_evidence",
  "update_evidence",
  "verify_claim",
  "record_verification_result",
  "set_verification_state",
  "propose_claim_change",
  "insert_comment",
  "replace_selected_content",
  "navigate_to_object",
  "get_research_diffs",
  "stage_research_diff",
  "review_research_diff",
  "navigate_to_research_diff",
];

const readSignal = (value) => (typeof value?.peek === "function" ? value.peek() : value?.value);
const toolResult = (payload, isError = false) => ({
  content: [{ type: "text", text: JSON.stringify(payload) }],
  structuredContent: payload,
  ...(isError ? { isError: true } : {}),
});
const toolError = (code, message, details = {}) => toolResult({ ok: false, error: { code, message, ...details } }, true);
const boundedString = (value, maxLength) => typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
const hasCriticSyntax = (value) => /\{(?:~~|\+\+|--)|(?:~~|\+\+|--)\}/.test(value || "") || (value || "").includes("~>");

const getView = (editorState) => readSignal(editorState.editorView);
const getSelection = (editorState) => readSignal(editorState.manuscriptSelection) || null;

const refreshSelection = (editorState, view) => {
  const next = deriveManuscriptSelection(view.state);
  editorState.manuscriptSelection.value = next;
  return next;
};

const resolveObject = (editorState, provenance, objectId) => {
  const data = readSignal(provenance.data) || { objects: [] };
  if (objectId) return data.objects.find((object) => object.id === objectId) || null;
  return provenance.findObjectForSelection(getSelection(editorState));
};

const currentRawSelection = (editorState, view) => {
  const selection = getSelection(editorState);
  if (!selection?.hasSelection || selection.to <= selection.from) return null;
  return {
    selection,
    text: view.state.sliceDoc(selection.from, selection.to),
  };
};

const assertExpectedText = (actual, expected, code = "STALE_SELECTION") => {
  if (actual === expected) return null;
  return toolError(code, "The manuscript changed after the agent read it. Read the current selection again before proposing a change.", {
    expectedText: expected,
    actualText: actual,
  });
};

const stageReplacement = (editorState, range, expectedText, replacementText) => {
  const view = getView(editorState);
  if (!view) return toolError("EDITOR_UNAVAILABLE", "The manuscript editor is not ready.");
  if (!boundedString(expectedText, 10000))
    return toolError("INVALID_EXPECTED_TEXT", "expectedText must be a non-empty string of at most 10,000 characters.");
  if (typeof replacementText !== "string" || replacementText.length > 10000)
    return toolError("INVALID_REPLACEMENT_TEXT", "replacementText must be a string of at most 10,000 characters.");
  if (hasCriticSyntax(expectedText) || hasCriticSyntax(replacementText))
    return toolError(
      "UNSUPPORTED_CRITIC_MARKUP",
      "The current review format cannot safely nest CriticMarkup syntax. Revise the proposed text first.",
    );

  const actualText = view.state.sliceDoc(range.from, range.to);
  const stale = assertExpectedText(actualText, expectedText);
  if (stale) return stale;

  const markup = `{~~${expectedText}~>${replacementText}~~}`;
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: markup },
    selection: { anchor: range.from, head: range.from + markup.length },
    scrollIntoView: true,
  });
  refreshSelection(editorState, view);

  return toolResult({
    ok: true,
    reviewRequired: true,
    applied: false,
    proposal: {
      kind: "replacement",
      from: range.from,
      to: range.from + markup.length,
      remove: expectedText,
      insert: replacementText,
    },
    message: "The replacement is staged as an inline manuscript suggestion. The researcher must accept or reject it in the editor.",
  });
};

const criticPattern = /\{~~([\s\S]*?)~>([\s\S]*?)~~\}|\{\+\+([\s\S]*?)\+\+\}|\{--([\s\S]*?)--\}/g;

const pendingResearchDiffs = (editorState) => {
  const view = getView(editorState);
  if (!view) return [];
  const source = view.state.doc.toString();
  const pattern = new RegExp(criticPattern.source, "g");
  const diffs = [];
  let match;
  while ((match = pattern.exec(source))) {
    const replacement = match[1] !== undefined;
    const addition = match[3] !== undefined;
    const from = match.index;
    const to = from + match[0].length;
    diffs.push({
      from,
      to,
      line: view.state.doc.lineAt(from).number,
      kind: replacement ? "replacement" : addition ? "addition" : "deletion",
      remove: replacement ? match[1] : addition ? "" : match[4],
      insert: replacement ? match[2] : addition ? match[3] : "",
      status: "pending-review",
    });
  }
  return diffs;
};

const evidenceInputSchema = {
  type: "object",
  properties: {
    objectId: { type: "string", description: "Optional tracked manuscript object id. Omit it to use the currently selected tracked object." },
    type: { type: "string", enum: EVIDENCE_TYPES },
    label: { type: "string", maxLength: 300 },
    artifactId: { type: "string", maxLength: 300 },
    experimentId: { type: "string", maxLength: 300 },
    commit: { type: "string", maxLength: 200 },
    metric: { type: "string", maxLength: 500 },
    uri: { type: "string", maxLength: 1000 },
    relation: { type: "string", enum: PROVENANCE_RELATIONS },
    notes: { type: "string", maxLength: 2000 },
  },
  required: ["label"],
  additionalProperties: false,
};

const mutatingAnnotations = { readOnlyHint: false, untrustedContentHint: true };
const readOnlyAnnotations = { readOnlyHint: true, untrustedContentHint: true };

export function buildResearchWebMCPActionTools(editorState) {
  const provenance = ensureProvenanceStore(editorState);

  return [
    {
      name: "create_claim",
      title: "Create tracked claim",
      description:
        "Create a first-class provenance claim from the researcher's current explicit text selection. Requires the exact text previously read by the agent so stale selections fail safely.",
      inputSchema: {
        type: "object",
        properties: {
          expectedText: { type: "string", minLength: 1, maxLength: 10000, description: "Exact selected manuscript text observed before this call." },
        },
        required: ["expectedText"],
        additionalProperties: false,
      },
      annotations: mutatingAnnotations,
      execute: async (input = {}) => {
        const view = getView(editorState);
        if (!view) return toolError("EDITOR_UNAVAILABLE", "The manuscript editor is not ready.");
        const current = currentRawSelection(editorState, view);
        if (!current) return toolError("NO_EXPLICIT_SELECTION", "Select the exact manuscript text that should become a claim.");
        const stale = assertExpectedText(current.text, input.expectedText);
        if (stale) return stale;
        if (!["claim", "text"].includes(current.selection.kind))
          return toolError("INVALID_CLAIM_SELECTION", "The current selection is not claim-like text.", { kind: current.selection.kind });

        const existing = provenance.findObjectForSelection(current.selection);
        const claim = provenance.createObject(current.selection, "claim");
        if (!claim) return toolError("CLAIM_CREATION_FAILED", "The current selection could not be converted into a tracked claim.");
        return toolResult({ ok: true, created: !existing, claim, integrity: provenance.stats() });
      },
    },
    {
      name: "attach_evidence",
      title: "Attach research evidence",
      description:
        "Attach structured evidence to the selected or explicitly identified tracked manuscript object. This visibly updates the same provenance state shown in the integrity panel.",
      inputSchema: evidenceInputSchema,
      annotations: mutatingAnnotations,
      execute: async (input = {}) => {
        const object = resolveObject(editorState, provenance, input.objectId);
        if (!object) return toolError("OBJECT_NOT_FOUND", "Select a tracked manuscript object or provide a valid objectId.");
        if (!boundedString(input.label, 300)) return toolError("INVALID_EVIDENCE_LABEL", "Evidence label must be between 1 and 300 characters.");
        const result = provenance.addEvidence(object.id, input);
        if (!result) return toolError("EVIDENCE_CREATION_FAILED", "The evidence could not be attached to the tracked object.");
        return toolResult({ ok: true, object: resolveObject(editorState, provenance, object.id), ...result, integrity: provenance.stats() });
      },
    },
    {
      name: "update_evidence",
      title: "Update linked research evidence",
      description:
        "Update structured evidence already linked to a tracked manuscript object. The evidence must belong to that object; unrelated evidence cannot be edited through this call.",
      inputSchema: {
        type: "object",
        properties: {
          objectId: { type: "string", description: "Optional tracked object id. Omit it to use the selected tracked object." },
          evidenceId: { type: "string" },
          type: { type: "string", enum: EVIDENCE_TYPES },
          label: { type: "string", maxLength: 300 },
          artifactId: { type: "string", maxLength: 300 },
          experimentId: { type: "string", maxLength: 300 },
          commit: { type: "string", maxLength: 200 },
          metric: { type: "string", maxLength: 500 },
          uri: { type: "string", maxLength: 1000 },
          relation: { type: "string", enum: PROVENANCE_RELATIONS },
          notes: { type: "string", maxLength: 2000 },
        },
        required: ["evidenceId"],
        additionalProperties: false,
      },
      annotations: mutatingAnnotations,
      execute: async (input = {}) => {
        const object = resolveObject(editorState, provenance, input.objectId);
        if (!object) return toolError("OBJECT_NOT_FOUND", "Select a tracked manuscript object or provide a valid objectId.");
        const linked = provenance.evidenceForObject(object.id).find((entry) => entry.evidence.id === input.evidenceId);
        if (!linked)
          return toolError("EVIDENCE_NOT_LINKED", "The requested evidence is not linked to the tracked object.", { evidenceId: input.evidenceId });

        const { objectId: _, evidenceId: __, relation, ...patch } = input;
        if (Object.keys(patch).length === 0 && relation === undefined)
          return toolError("EMPTY_EVIDENCE_UPDATE", "Provide at least one evidence field to update.");
        if (patch.label !== undefined && !boundedString(patch.label, 300))
          return toolError("INVALID_EVIDENCE_LABEL", "Evidence label must be between 1 and 300 characters.");
        provenance.updateEvidence(input.evidenceId, patch);
        if (relation !== undefined) provenance.updateLink(linked.link.id, { relation });
        const updated = provenance.evidenceForObject(object.id).find((entry) => entry.evidence.id === input.evidenceId);
        return toolResult({ ok: true, object: resolveObject(editorState, provenance, object.id), ...updated });
      },
    },
    {
      name: "verify_claim",
      title: "Verify quantitative claim",
      description:
        "Run the editor's deterministic Verify This comparison for a selected or identified tracked claim. It compares only unambiguous manuscript and evidence metric values and returns an honest review-required outcome otherwise.",
      inputSchema: {
        type: "object",
        properties: {
          claimId: { type: "string", description: "Optional tracked claim id. Omit it to use the selected tracked claim." },
        },
        additionalProperties: false,
      },
      annotations: mutatingAnnotations,
      execute: async (input = {}) => {
        const claim = resolveObject(editorState, provenance, input.claimId);
        if (!claim || claim.kind !== "claim") return toolError("CLAIM_NOT_FOUND", "Select a tracked claim or provide a valid claimId.");
        const verification = verifyQuantitativeClaim(claim, provenance.evidenceForObject(claim.id), { source: "webmcp-deterministic" });
        const updated = provenance.recordVerification(claim.id, verification);
        return toolResult({ ok: true, claim: updated, verification, reviewRequired: verification.verificationState === "needs-review" });
      },
    },
    {
      name: "record_verification_result",
      title: "Record external verification result",
      description:
        "Record an evidence-backed conclusion from an external research agent on a tracked claim. This stores the visible result and reasons but never changes manuscript text; use propose_claim_change separately for a researcher-reviewed correction.",
      inputSchema: {
        type: "object",
        properties: {
          claimId: { type: "string", description: "Optional tracked claim id. Omit it to use the selected tracked claim." },
          outcome: { type: "string", enum: VERIFICATION_OUTCOMES },
          reason: { type: "string", minLength: 1, maxLength: 2000 },
          evidenceIds: { type: "array", items: { type: "string" }, maxItems: 50 },
        },
        required: ["outcome", "reason", "evidenceIds"],
        additionalProperties: false,
      },
      annotations: mutatingAnnotations,
      execute: async (input = {}) => {
        const claim = resolveObject(editorState, provenance, input.claimId);
        if (!claim || claim.kind !== "claim") return toolError("CLAIM_NOT_FOUND", "Select a tracked claim or provide a valid claimId.");
        if (!VERIFICATION_OUTCOMES.includes(input.outcome))
          return toolError("INVALID_VERIFICATION_OUTCOME", "Provide a supported verification outcome.");
        if (!boundedString(input.reason, 2000)) return toolError("INVALID_VERIFICATION_REASON", "Provide a concise verification reason.");

        const linked = provenance.evidenceForObject(claim.id);
        const requestedIds = new Set(Array.isArray(input.evidenceIds) ? input.evidenceIds : []);
        const references = linked.filter((entry) => requestedIds.has(entry.evidence.id));
        if (references.length !== requestedIds.size)
          return toolError("EVIDENCE_NOT_LINKED", "Every evidenceId must identify evidence linked to this claim.");
        if (["verified", "contradicted", "stale", "partially-supported"].includes(input.outcome) && !references.length)
          return toolError("EVIDENCE_REQUIRED", "This verification outcome requires at least one linked evidence reference.");
        if (input.outcome === "missing-evidence" && references.length)
          return toolError("INVALID_MISSING_EVIDENCE", "A missing-evidence result cannot cite evidence as support.");

        const evidenceReferences = references.map(({ link, evidence }) => ({
          evidenceId: evidence.id,
          label: evidence.label,
          type: evidence.type,
          relation: link.relation,
          artifactId: evidence.artifactId || "",
          experimentId: evidence.experimentId || "",
          commit: evidence.commit || "",
          metric: evidence.metric || "",
          uri: evidence.uri || "",
          updatedAt: evidence.updatedAt,
        }));
        const verification = normalizeAgentVerification(input, evidenceReferences);
        const updated = provenance.recordVerification(claim.id, verification);
        return toolResult({ ok: true, claim: updated, verification, manuscriptChanged: false, reviewRequired: input.outcome !== "verified" });
      },
    },
    {
      name: "set_verification_state",
      title: "Set verification state",
      description:
        "Set the verification state of a tracked manuscript object. Verified, stale, contradicted, and needs-review states require linked evidence; unlinked is only valid when no evidence is attached.",
      inputSchema: {
        type: "object",
        properties: {
          objectId: { type: "string", description: "Optional tracked object id. Omit it to use the selected tracked object." },
          verificationState: { type: "string", enum: VERIFICATION_STATES },
        },
        required: ["verificationState"],
        additionalProperties: false,
      },
      annotations: mutatingAnnotations,
      execute: async (input = {}) => {
        const object = resolveObject(editorState, provenance, input.objectId);
        if (!object) return toolError("OBJECT_NOT_FOUND", "Select a tracked manuscript object or provide a valid objectId.");
        if (!VERIFICATION_STATES.includes(input.verificationState))
          return toolError("INVALID_VERIFICATION_STATE", "Provide a supported verification state.");
        const evidence = provenance.evidenceForObject(object.id);
        if (input.verificationState === "unlinked" && evidence.length > 0)
          return toolError("EVIDENCE_PRESENT", "Remove or relink the object's evidence before marking it unlinked.");
        if (input.verificationState !== "unlinked" && evidence.length === 0)
          return toolError("EVIDENCE_REQUIRED", "Attach research evidence before setting a reviewed verification state.");
        provenance.updateObject(object.id, { verificationState: input.verificationState });
        return toolResult({ ok: true, object: resolveObject(editorState, provenance, object.id), integrity: provenance.stats() });
      },
    },
    {
      name: "propose_claim_change",
      title: "Propose claim change",
      description:
        "Stage a replacement for a tracked claim as CriticMarkup. This never silently accepts the new manuscript text: the researcher receives the editor's normal accept/reject controls.",
      inputSchema: {
        type: "object",
        properties: {
          claimId: { type: "string", description: "Optional tracked claim id. Omit it to use the selected tracked claim." },
          expectedText: { type: "string", minLength: 1, maxLength: 10000 },
          replacementText: { type: "string", maxLength: 10000 },
        },
        required: ["expectedText", "replacementText"],
        additionalProperties: false,
      },
      annotations: mutatingAnnotations,
      execute: async (input = {}) => {
        const view = getView(editorState);
        if (!view) return toolError("EDITOR_UNAVAILABLE", "The manuscript editor is not ready.");
        const claim = resolveObject(editorState, provenance, input.claimId);
        if (!claim || claim.kind !== "claim") return toolError("CLAIM_NOT_FOUND", "Select a tracked claim or provide a valid claimId.");
        const range = resolveXrayRange(view.state.doc, claim);
        if (!range) return toolError("CLAIM_ANCHOR_NOT_FOUND", "The tracked claim can no longer be located in the current manuscript.");
        const result = stageReplacement(editorState, range, input.expectedText, input.replacementText);
        if (!result.isError) result.structuredContent.claimId = claim.id;
        return result;
      },
    },
    {
      name: "insert_comment",
      title: "Insert manuscript comment",
      description:
        "Insert an additive visible comment on the current selection line or a tracked object's line. Existing comment threads are never overwritten; the tool fails if that line already has a comment.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", minLength: 1, maxLength: 2000 },
          objectId: { type: "string", description: "Optional tracked object whose anchor line should receive the comment." },
          line: { type: "integer", minimum: 1, description: "Optional explicit one-based manuscript line number." },
        },
        required: ["text"],
        additionalProperties: false,
      },
      annotations: mutatingAnnotations,
      execute: async (input = {}) => {
        if (!boundedString(input.text, 2000)) return toolError("INVALID_COMMENT", "Comment text must be between 1 and 2,000 characters.");
        const view = getView(editorState);
        const collab = readSignal(editorState.collab);
        const ycomments = collab?.ycomments;
        if (!view || !ycomments) return toolError("COMMENTS_UNAVAILABLE", "Comments are unavailable in the current editor session.");
        const object = input.objectId ? resolveObject(editorState, provenance, input.objectId) : null;
        if (input.objectId && !object) return toolError("OBJECT_NOT_FOUND", "No tracked manuscript object exists with the requested objectId.");
        const selection = getSelection(editorState);
        const line = input.line || object?.anchor?.line || selection?.line || 1;
        if (!Number.isInteger(line) || line < 1 || line > view.state.doc.lines)
          return toolError("INVALID_COMMENT_LINE", "The requested comment line is outside the current manuscript.");
        if (ycomments.findCommentOn(line))
          return toolError(
            "COMMENT_ALREADY_EXISTS",
            "That manuscript line already has a comment. The agent will not overwrite or merge into the researcher's existing thread.",
            { line },
          );

        const commentId = ycomments.newComment(line);
        ycomments.getTextForComment(commentId).insert(0, input.text.trim());
        ycomments.display().updateComment(commentId, { isShown: true });
        ycomments.updateMainCodeMirror();
        return toolResult({ ok: true, comment: { id: commentId, line, text: input.text.trim() } });
      },
    },
    {
      name: "replace_selected_content",
      title: "Replace selected manuscript content for review",
      description:
        "Stage a replacement for the researcher's current explicit selection. Despite the action name, the new text is not silently accepted: it is inserted as CriticMarkup and remains pending until the researcher accepts or rejects it.",
      inputSchema: {
        type: "object",
        properties: {
          expectedText: { type: "string", minLength: 1, maxLength: 10000, description: "Exact selected text observed before this call." },
          replacementText: { type: "string", maxLength: 10000 },
        },
        required: ["expectedText", "replacementText"],
        additionalProperties: false,
      },
      annotations: mutatingAnnotations,
      execute: async (input = {}) => {
        const view = getView(editorState);
        if (!view) return toolError("EDITOR_UNAVAILABLE", "The manuscript editor is not ready.");
        const current = currentRawSelection(editorState, view);
        if (!current) return toolError("NO_EXPLICIT_SELECTION", "Select the exact manuscript text to replace before calling this tool.");
        return stageReplacement(editorState, { from: current.selection.from, to: current.selection.to }, input.expectedText, input.replacementText);
      },
    },
    {
      name: "navigate_to_object",
      title: "Navigate to manuscript object",
      description:
        "Move the visible editor selection to a tracked claim, method, figure, or table. This changes navigation state only; it does not modify manuscript or provenance content.",
      inputSchema: {
        type: "object",
        properties: { objectId: { type: "string" } },
        required: ["objectId"],
        additionalProperties: false,
      },
      annotations: mutatingAnnotations,
      execute: async (input = {}) => {
        const view = getView(editorState);
        if (!view) return toolError("EDITOR_UNAVAILABLE", "The manuscript editor is not ready.");
        const object = resolveObject(editorState, provenance, input.objectId);
        if (!object) return toolError("OBJECT_NOT_FOUND", "No tracked manuscript object exists with the requested objectId.");
        const range = resolveXrayRange(view.state.doc, object);
        if (!range) return toolError("OBJECT_ANCHOR_NOT_FOUND", "The tracked object can no longer be located in the current manuscript.");
        view.dispatch({ selection: { anchor: range.from, head: range.to }, scrollIntoView: true });
        view.focus();
        const selection = refreshSelection(editorState, view);
        return toolResult({ ok: true, object, selection });
      },
    },
    {
      name: "get_research_diffs",
      title: "Get reviewable manuscript changes",
      description: "Return evidence-driven Research Diff entries from live provenance alongside currently pending CriticMarkup manuscript proposals.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: readOnlyAnnotations,
      execute: async () => {
        const researchDiffs = detectResearchDiffs(readSignal(provenance.data));
        const proposalDiffs = pendingResearchDiffs(editorState);
        return toolResult({ ok: true, diffs: proposalDiffs, researchDiffs, total: researchDiffs.length + proposalDiffs.length });
      },
    },
    {
      name: "stage_research_diff",
      title: "Stage research diff for researcher review",
      description:
        "Stage the proposed manuscript text for one evidence-driven Research Diff as CriticMarkup. The update remains unapplied until the researcher uses the visible accept/reject controls.",
      inputSchema: {
        type: "object",
        properties: { diffId: { type: "string" } },
        required: ["diffId"],
        additionalProperties: false,
      },
      annotations: mutatingAnnotations,
      execute: async (input = {}) => {
        const diff = detectResearchDiffs(readSignal(provenance.data)).find((item) => item.id === input.diffId);
        if (!diff) return toolError("RESEARCH_DIFF_NOT_FOUND", "No evidence-driven Research Diff exists with that id.");
        if (!diff.proposedText)
          return toolError("REVIEW_REQUIRED", "This diff cannot be converted into deterministic manuscript text and requires researcher review.");
        const view = getView(editorState);
        const object = resolveObject(editorState, provenance, diff.objectId);
        const range = resolveXrayRange(view?.state.doc, object);
        if (!view || !range) return toolError("OBJECT_ANCHOR_NOT_FOUND", "The affected manuscript object can no longer be located.");
        const staged = stageReplacement(editorState, range, object.text, diff.proposedText);
        if (staged.isError) return staged;
        const review = provenance.reviewResearchDiff(diff.id, "in-review", { reviewRequired: true, source: "webmcp" });
        return toolResult({ ...staged.structuredContent, diff: { ...diff, status: "in-review", review }, diffId: diff.id });
      },
    },
    {
      name: "review_research_diff",
      title: "Defer or reject research diff",
      description:
        "Record a defer or reject decision for an evidence-driven Research Diff without changing manuscript text. Agents cannot accept manuscript rewrites.",
      inputSchema: {
        type: "object",
        properties: {
          diffId: { type: "string" },
          decision: { type: "string", enum: ["deferred", "rejected"] },
          reason: { type: "string", maxLength: 1000 },
        },
        required: ["diffId", "decision"],
        additionalProperties: false,
      },
      annotations: mutatingAnnotations,
      execute: async (input = {}) => {
        const diff = detectResearchDiffs(readSignal(provenance.data)).find((item) => item.id === input.diffId);
        if (!diff) return toolError("RESEARCH_DIFF_NOT_FOUND", "No evidence-driven Research Diff exists with that id.");
        if (!["deferred", "rejected"].includes(input.decision))
          return toolError("INVALID_RESEARCH_DIFF_DECISION", "Agents may only defer or reject a Research Diff.");
        const review = provenance.reviewResearchDiff(diff.id, input.decision, { reason: input.reason?.trim() || "", source: "webmcp" });
        return toolResult({ ok: true, diff: { ...diff, status: input.decision, review }, manuscriptChanged: false });
      },
    },
    {
      name: "navigate_to_research_diff",
      title: "Navigate to reviewable manuscript change",
      description:
        "Move the visible editor selection to an evidence-driven Research Diff or pending CriticMarkup proposal so the researcher can inspect it without changing manuscript content.",
      inputSchema: {
        type: "object",
        properties: {
          from: { type: "integer", minimum: 0, description: "A pending CriticMarkup diff's `from` value." },
          diffId: { type: "string", description: "An evidence-driven Research Diff id." },
        },
        anyOf: [{ required: ["from"] }, { required: ["diffId"] }],
        additionalProperties: false,
      },
      annotations: mutatingAnnotations,
      execute: async (input = {}) => {
        const view = getView(editorState);
        if (!view) return toolError("EDITOR_UNAVAILABLE", "The manuscript editor is not ready.");
        const researchDiff = input.diffId ? detectResearchDiffs(readSignal(provenance.data)).find((item) => item.id === input.diffId) : null;
        if (researchDiff) {
          const object = resolveObject(editorState, provenance, researchDiff.objectId);
          const range = resolveXrayRange(view.state.doc, object);
          if (!range) return toolError("OBJECT_ANCHOR_NOT_FOUND", "The affected manuscript object can no longer be located.");
          view.dispatch({ selection: { anchor: range.from, head: range.to }, scrollIntoView: true });
          view.focus();
          const selection = refreshSelection(editorState, view);
          return toolResult({ ok: true, diff: researchDiff, selection, reviewRequired: true });
        }
        const diff = pendingResearchDiffs(editorState).find((item) => item.from === input.from);
        if (!diff)
          return toolError("RESEARCH_DIFF_NOT_FOUND", "No pending reviewable manuscript change exists at that position.", { from: input.from });
        view.dispatch({ selection: { anchor: diff.from, head: diff.to }, scrollIntoView: true });
        view.focus();
        refreshSelection(editorState, view);
        return toolResult({ ok: true, diff, reviewRequired: true });
      },
    },
  ];
}
