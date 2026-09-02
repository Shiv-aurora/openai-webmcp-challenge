# Status

Current phase: Phase 3 — Build Research X-Ray
Current objective: Turn durable provenance relationships and verification states into a visual manuscript integrity map.

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
- Added browser coverage for provenance creation, evidence linking, verification review, evidence editing/removal, object removal, and persistence.
- Added repeatable CI for formatting, lint, production build, collaboration runtime, and browser tests.

Last verified:
- `npm ci`
- `npm run check-format`
- `npm run lint` with zero errors
- `npm run build`
- `npm run test` — 55 Playwright tests passed against the production preview and live collaboration server

Blockers:
- None for Phase 3 implementation.

Known risks:
- The inherited dependency lock reports 43 npm audit findings that require production-impact triage before public deployment.
- The pinned upstream code still emits non-blocking lint warnings that should be addressed only when touched or shown to affect behavior.
- Phase 2 provenance persistence is browser-local and is not yet synchronized through the inherited collaboration server; the storage/synchronization boundary must be resolved before multi-user or production WebMCP use.

Next:
- Build X-Ray mode that renders verified, stale, contradicted, unlinked, and review-required status across tracked manuscript objects and provides manuscript-level integrity counts.
