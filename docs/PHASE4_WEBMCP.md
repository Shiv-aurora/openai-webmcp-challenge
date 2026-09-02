# Phase 4 WebMCP Surface

Phase 4 now has a complete read-only WebMCP surface over the live editor and provenance state.

Registered read tools:

- `get_current_selection` — returns the researcher's current manuscript selection, section, object kind, and verification state.
- `get_manuscript_context` — returns live selection, section, or manuscript context together with document and integrity metadata.
- `get_claim` — returns the currently selected claim, or a tracked claim by id, including verification state and linked evidence.
- `get_figure` — returns the currently selected figure, or a tracked figure by id, including verification state and linked evidence.
- `get_table` — returns the currently selected table, or a tracked table by id, including verification state and linked evidence.
- `get_current_section` — returns the named section containing the current selection together with that section's exact live manuscript text.
- `get_provenance` — returns provenance and linked evidence for the selected tracked manuscript object, or an explicit object id.
- `get_integrity_status` — returns manuscript-level integrity counts and bounded summaries of tracked provenance objects.
- `get_navigation_targets` — returns bounded, source-ordered tracked manuscript objects, optionally filtered by object kind or verification state.

All nine tools declare `readOnlyHint: true` and `untrustedContentHint: true`. They read editor and provenance state at invocation time and do not mutate manuscript, selection, provenance, evidence, verification, or navigation state. Researcher-authored manuscript and evidence content is therefore returned as untrusted data rather than agent instructions.

Missing claim, figure, table, section, or provenance context is returned as an explicit structured tool error instead of inferred or fabricated state. Figure and table tools may return the current untracked selection honestly, with no linked evidence, until the researcher creates provenance.

`get_navigation_targets` is discovery only. It exposes safe anchors an agent can discuss or later request to navigate to; it does not move the editor or change researcher state.

The integration uses the current WebMCP imperative surface at `document.modelContext.registerTool()`. Browsers without WebMCP support continue to run the editor normally; tool registration becomes a no-op.

## Verification

The final read-only surface passed formatting, lint with zero errors, production build, Chromium setup, collaboration runtime, and the complete 69-test Playwright suite. The final run completed with 68 clean passes plus one inherited collaboration test that passed on retry and was reported as flaky; no WebMCP test was flaky or failing.

The next Phase 4 milestone is the review-safe action surface. Any write-capable tool must preserve researcher control, expose appropriate mutating/destructive annotations, and avoid silently applying claim, evidence, verification, comment, or manuscript changes.
