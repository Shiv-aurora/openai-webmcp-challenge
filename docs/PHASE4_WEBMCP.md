# Phase 4 WebMCP Surface

Phase 4 exposes the core research-integrity workflow through the live editor's WebMCP surface while preserving researcher control over consequential manuscript changes.

## Read tools

- `get_current_selection` — returns the researcher's current manuscript selection, section, object kind, and verification state.
- `get_manuscript_context` — returns live selection, section, or manuscript context together with document and integrity metadata.
- `get_claim` — returns the currently selected claim, or a tracked claim by id, including verification state and linked evidence.
- `get_figure` — returns the currently selected figure, or a tracked figure by id, including verification state and linked evidence.
- `get_table` — returns the currently selected table, or a tracked table by id, including verification state and linked evidence.
- `get_current_section` — returns the named section containing the current selection together with that section's exact live manuscript text.
- `get_provenance` — returns provenance and linked evidence for the selected tracked manuscript object, or an explicit object id.
- `get_integrity_status` — returns manuscript-level integrity counts and bounded summaries of tracked provenance objects.
- `get_navigation_targets` — returns bounded, source-ordered tracked manuscript objects, optionally filtered by object kind or verification state.

All nine read tools declare `readOnlyHint: true` and `untrustedContentHint: true`. They read editor and provenance state at invocation time and do not mutate manuscript, selection, provenance, evidence, verification, or navigation state.

## Action and review tools

- `create_claim` — creates a tracked claim from the researcher's current explicit text selection after an exact-text stale-selection check.
- `attach_evidence` — attaches structured evidence to the selected or explicitly identified tracked manuscript object.
- `update_evidence` — updates evidence already linked to the chosen tracked object, including its provenance relationship.
- `set_verification_state` — changes verification state while preserving the product's evidence-gating rules.
- `propose_claim_change` — stages a tracked claim replacement as CriticMarkup for researcher review.
- `insert_comment` — adds a visible manuscript comment without overwriting an existing thread on the same line.
- `replace_selected_content` — stages the current explicit selection as a CriticMarkup replacement after an exact-text concurrency check.
- `navigate_to_object` — moves the visible editor selection to a tracked manuscript object without changing manuscript or provenance content.
- `get_research_diffs` — returns pending CriticMarkup manuscript proposals as reviewable diffs.
- `navigate_to_research_diff` — moves the visible editor selection to a pending reviewable diff without accepting or rejecting it.

Mutating and navigation actions declare `readOnlyHint: false` and `untrustedContentHint: true`; `get_research_diffs` remains read-only. The current WebMCP annotation dictionary does not define destructive or idempotency hints, so Phase 4 does not invent non-standard annotations.

Researcher-authored manuscript and evidence content is treated as untrusted data rather than agent instructions. Missing or stale context returns an explicit structured tool error instead of inferred or fabricated state.

## Researcher control

Consequential manuscript rewrites are never silently accepted by an agent. `propose_claim_change` and `replace_selected_content` insert the editor's existing CriticMarkup review format, and there is deliberately no WebMCP tool that accepts or rejects those proposals. The researcher retains the normal visible accept/reject controls.

Claim, evidence, and verification actions mutate the same provenance state used by the integrity panel and Research X-Ray. Verification states remain evidence-gated. Comments are additive and fail instead of overwriting an existing thread. Navigation actions change selection/scroll state only.

Exact `expectedText` checks guard claim creation and manuscript replacements against stale agent context. A manuscript change that occurred after an agent read the selection causes the write to fail safely and requires a fresh read.

`get_research_diffs` in Phase 4 exposes pending CriticMarkup proposals. Evidence-driven detection of research changes remains the dedicated Research Diff phase later in the implementation plan.

The integration uses the current WebMCP imperative surface at `document.modelContext.registerTool()`. Browsers without WebMCP support continue to run the editor normally; tool registration becomes a no-op.

## Verification

The complete Phase 4 surface registers 19 tools: nine read tools and ten action/review tools. The final Phase 4 branch passed dependency installation, formatting, lint with zero errors, production build, Chromium setup, collaboration runtime, and the complete Playwright suite: **79/79 tests passed** against the production preview and live collaboration server.
