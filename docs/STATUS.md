# Status

Current phase: Phase 2 — Add Provenance-Native Manuscript Objects
Current objective: Introduce durable claim and evidence objects on top of the live manuscript selection model.

Completed:
- Imported and attributed Antmicro MyST Editor at pinned revision `c32e8e77f504a57aee253e07d4e7a44b8c8ecc30`.
- Preserved inherited scientific editing, preview, equations, tables, comments, suggestions, collaboration, templates, diff, and outline capabilities.
- Established a product-branded scientific manuscript workspace and deterministic demo manuscript.
- Added a native research-integrity side panel inside the editor's live Shadow DOM and state model.
- Added live manuscript metrics for section and word counts.
- Added first-class selection context for text, claims, methods, tables, figures, and sections.
- Exposed selection context through the shared editor state for later WebMCP tools.
- Added an editor toolbar control to close and restore the integrity panel.
- Added browser coverage for the integrity panel and every supported Phase 1 selection type.
- Added repeatable CI for formatting, lint, production build, collaboration runtime, and browser tests.

Last verified:
- `npm ci`
- `npm run check-format`
- `npm run lint` with zero errors
- `npm run build`
- `npm run test` — 49 Playwright tests against the production preview and live collaboration server

Blockers:
- None for Phase 2 implementation.

Known risks:
- The inherited dependency lock reports npm audit findings that require production-impact triage before public deployment.
- The pinned upstream code still emits non-blocking lint warnings that should be addressed only when touched or shown to affect behavior.
- Selection classification is intentionally structural and local in Phase 1; durable user-created provenance objects begin in Phase 2.

Next:
- Define the claim, evidence, provenance-link, and verification-state model; allow a researcher to create a claim from the current selection and inspect it from the manuscript.
