# Status

Current phase: Phase 6 — Build Research Diff
Current objective: Detect evidence-driven drift across tracked manuscript objects and provide a real, grouped review workflow showing manuscript state beside current research state with inspect, accept-for-visible-review, reject, and defer actions.

Completed:
- Imported and attributed Antmicro MyST Editor at pinned revision `c32e8e77f504a57aee253e07d4e7a44b8c8ecc30`.
- Preserved inherited scientific editing, preview, equations, tables, comments, suggestions, collaboration, templates, diff, and outline capabilities.
- Established a product-branded scientific manuscript workspace and deterministic demo manuscript.
- Added a native research-integrity side panel inside the editor's live Shadow DOM and state model.
- Added live manuscript metrics and first-class selection context for text, claims, methods, tables, figures, and sections.
- Added durable first-class provenance objects for claims, methods, figures, and tables.
- Added manual claim creation from ordinary selected text.
- Added structured research evidence and provenance links with evidence type, source/artifact, artifact identity, experiment identity, commit, metric, relationship, URI/path, and notes.
- Added manual create, inspect, edit, remove, and review workflows for provenance relationships.
- Added verification states for unlinked, needs review, verified, stale, and contradicted manuscript objects.
- Persisted provenance state across browser reloads and exposed it on the live editor state for WebMCP tools.
- Added a global Research X-Ray mode with distinct verified, needs-review, stale, contradicted, and unlinked treatments, manuscript-level counts, navigation, and an honest empty state.
- Registered WebMCP tools through `document.modelContext.registerTool()` with editor-lifecycle cleanup and graceful no-op behavior when WebMCP is unavailable.
- Completed nine invocation-time read tools for selection, manuscript context, claims, figures, tables, current section, provenance, integrity status, and navigation targets.
- Completed ten action/review tools for claim creation, evidence attachment/update, evidence-gated verification, review-only claim and selection replacements, additive comments, object navigation, pending review diff retrieval, and review-diff navigation.
- Kept all researcher-authored manuscript and evidence content marked as untrusted WebMCP content.
- Added exact-text stale-selection guards for claim creation and manuscript replacement actions.
- Kept consequential manuscript rewrites reviewable: WebMCP stages CriticMarkup proposals, while only the researcher has the existing visible accept/reject controls.
- Kept comments additive rather than overwriting existing threads and kept navigation actions non-destructive to manuscript/provenance content.
- Preserved the product's evidence-gated verification rules through the WebMCP action surface.
- Added browser coverage for the complete 19-tool WebMCP surface, shared human/agent provenance state, stale-context rejection, evidence workflows, verification gating, review-only manuscript writes, additive comments, non-mutating navigation, and pending review diffs.
- Added repeatable CI for formatting, lint, production build, collaboration runtime, and browser tests.
- Added the deterministic Verify This workflow for selected quantitative claims.
- Added honest verified, contradicted, missing-evidence, stale, partially-supported, and review-required outcomes with explicit reasons.
- Added deterministic comparison for percentages, grouped numbers, decimals, and scientific notation while rejecting ambiguous, conflicting, or incompatible values.
- Persisted structured verification outcomes, evidence references, source, timestamps, and bounded history on provenance objects.
- Made edits to evidence automatically stale previously verified linked objects.
- Added `verify_claim` and `record_verification_result` WebMCP tools that synchronize with the visible researcher UI.
- Preserved the manuscript boundary: external verification conclusions never rewrite text, and corrections still use researcher-reviewed CriticMarkup proposals.
- Confirmed the current WebMCP draft still uses `document.modelContext.registerTool(tool, { signal })` and supports only `readOnlyHint` and `untrustedContentHint` annotations.

Last verified:
- `npm ci`
- `npm run check-format`
- `npm run lint` with zero errors
- `npm run build`
- `npm run test` — 89/89 Playwright tests passed against the production preview and live collaboration server

Blockers:
- None for Phase 6 implementation.

Known risks:
- The inherited dependency lock reports 43 npm audit findings that require production-impact triage before public deployment.
- The pinned upstream code still emits non-blocking lint warnings that should be addressed only when touched or shown to affect behavior.
- Provenance and X-Ray state remain browser-local and are not yet synchronized through the inherited collaboration server; the storage/synchronization boundary must be resolved before multi-user or production WebMCP use.

Next:
- Build evidence-driven Research Diff detection from real provenance objects and linked evidence, not presentation fixtures.
- Cover quantitative, method/configuration, figure, table, and artifact changes with stable grouped diff entries.
- Add inspect, accept-for-visible-review, reject, and defer workflows without giving agents acceptance authority over manuscript rewrites.
- Expose the same pending diff state and navigation through the researcher UI and WebMCP.
