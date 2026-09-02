# Status

Current phase: Phase 5 — Build Verify This
Current objective: Implement the one-click verification loop for selected quantitative claims by resolving linked evidence, comparing manuscript claim values with stored evidence metrics, identifying stale, missing, or mismatched evidence, and returning a deterministic pass/fail reason without fabricating external execution.

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

Last verified:
- `npm ci`
- `npm run check-format`
- `npm run lint` with zero errors
- `npm run build`
- `npm run test` — 79/79 Playwright tests passed against the production preview and live collaboration server

Blockers:
- None for Phase 5 implementation.

Known risks:
- The inherited dependency lock reports 43 npm audit findings that require production-impact triage before public deployment.
- The pinned upstream code still emits non-blocking lint warnings that should be addressed only when touched or shown to affect behavior.
- Provenance and X-Ray state remain browser-local and are not yet synchronized through the inherited collaboration server; the storage/synchronization boundary must be resolved before multi-user or production WebMCP use.

Next:
- Build the deterministic Verify This loop for a selected quantitative claim.
- Resolve the claim's linked evidence and parse comparable manuscript/evidence metric values without inventing missing data.
- Distinguish verified, mismatched, stale, and missing-evidence outcomes with explicit reasons and provenance references.
- Surface the result through the researcher UI and WebMCP while keeping external experiment execution out of scope until a real execution backend exists.
