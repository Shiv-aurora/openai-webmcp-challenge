# Status

Current phase: Phase 4 — Expose Read-Only WebMCP Tools
Current objective: Let agents inspect the live manuscript selection, context, claims, and provenance through a minimal read-only WebMCP surface.

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
- Added browser coverage for one-interaction X-Ray toggling, all five integrity states across claims, methods, tables, and figures, viewport-aware highlighting and navigation, provenance drill-down, and empty-map behavior.
- Added repeatable CI for formatting, lint, production build, collaboration runtime, and browser tests.

Last verified:
- `npm ci`
- `npm run check-format`
- `npm run lint` with zero errors
- `npm run build`
- `npm run test` — 59 Playwright tests passed against the production preview and live collaboration server

Blockers:
- None for Phase 4 implementation.

Known risks:
- The inherited dependency lock reports 43 npm audit findings that require production-impact triage before public deployment.
- The pinned upstream code still emits non-blocking lint warnings that should be addressed only when touched or shown to affect behavior.
- Provenance and X-Ray state remain browser-local and are not yet synchronized through the inherited collaboration server; the storage/synchronization boundary must be resolved before multi-user or production WebMCP use.

Next:
- Expose `get_current_selection`, `get_manuscript_context`, `get_claim`, and `get_provenance` as read-only WebMCP tools with stable schemas grounded in the live editor state.
