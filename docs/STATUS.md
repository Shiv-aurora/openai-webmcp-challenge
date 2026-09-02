# Status

Current phase: Phase 4 — Define the WebMCP Surface
Current objective: Build review-safe provenance and manuscript actions on top of the verified nine-tool read-only WebMCP surface without silently overriding researcher decisions.

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
- Persisted provenance state across browser reloads and exposed it on the live editor state for later WebMCP tools.
- Added a global Research X-Ray mode that turns tracked manuscript content into a visual integrity map without changing manuscript text.
- Added distinct X-Ray treatments and manuscript-level counts for verified, needs-review, stale, contradicted, and unlinked objects.
- Added a navigable X-Ray integrity list that returns the researcher to the source manuscript object and its provenance/evidence inspector.
- Added an honest empty X-Ray state when no provenance objects have been tracked.
- Registered WebMCP tools through `document.modelContext.registerTool()` with editor-lifecycle cleanup and graceful no-op behavior when WebMCP is unavailable.
- Added `get_current_selection`, `get_manuscript_context`, `get_claim`, and `get_provenance` as read-only tools grounded in the live editor and provenance state at invocation time.
- Added `get_figure`, `get_table`, `get_current_section`, `get_integrity_status`, and `get_navigation_targets` to complete the read-only Phase 4 coverage.
- Added stable bounded schemas for manuscript, provenance, integrity, and navigation reads with explicit structured errors for missing claim, figure, table, section, or provenance context.
- Marked all nine read tools with `readOnlyHint: true` and `untrustedContentHint: true` so researcher-authored manuscript and evidence text remains data rather than agent instructions.
- Kept navigation-target retrieval discovery-only: it returns source anchors without moving the editor or changing researcher state.
- Added browser coverage for WebMCP registration metadata, live selection changes, scoped manuscript context, claim/figure/table/provenance retrieval, exact current-section retrieval, integrity summaries, filtered navigation targets, non-mutation, and missing-context errors.
- Added repeatable CI for formatting, lint, production build, collaboration runtime, and browser tests.

Last verified:
- `npm ci`
- `npm run check-format`
- `npm run lint` with zero errors
- `npm run build`
- `npm run test` — all 69 Playwright tests completed successfully against the production preview and live collaboration server: 68 clean passes plus one inherited collaboration test that passed on retry and was reported as flaky; no WebMCP test was flaky or failing

Blockers:
- None for the next Phase 4 milestone.

Known risks:
- The inherited dependency lock reports 43 npm audit findings that require production-impact triage before public deployment.
- The pinned upstream code still emits non-blocking lint warnings that should be addressed only when touched or shown to affect behavior.
- Provenance and X-Ray state remain browser-local and are not yet synchronized through the inherited collaboration server; the storage/synchronization boundary must be resolved before multi-user or production WebMCP use.

Next:
- Expose review-safe claim, evidence, verification, comment, and manuscript-change actions with explicit mutating/destructive annotations and researcher-review boundaries.
- Keep agent writes reversible or reviewable where practical and never silently reinterpret researcher-authored manuscript or evidence content as instructions.
