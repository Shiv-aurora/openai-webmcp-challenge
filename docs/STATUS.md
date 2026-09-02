# Status

Current phase: Phase 1 — Build the Core Manuscript Experience
Current objective: Establish the manuscript workspace shell, research-integrity panel, and selection model without weakening inherited editor capabilities.

Completed:
- Imported Antmicro MyST Editor at pinned revision `c32e8e77f504a57aee253e07d4e7a44b8c8ecc30`.
- Retained the Apache-2.0 license and added explicit upstream attribution.
- Preserved the original upstream README in `docs/UPSTREAM_MYST_EDITOR.md`.
- Persisted `docs/VISION.md`, `docs/IMPLEMENTATION.md`, and this execution checkpoint.
- Rebranded the default application entry point as Research Integrity Editor.
- Added a polished scientific demo manuscript containing the values needed for later verification and Research Diff workflows.
- Added Node 20 project metadata and repeatable CI for formatting, lint, build, and browser validation.
- Applied focused corrections for blocking lint defects in the pinned upstream revision.
- Reconciled the inherited browser suite with the product manuscript while preserving upstream editor behavior.
- Verified the production build in Chromium with the complete inherited Playwright suite and collaboration server.

Last verified:
- `npm ci`
- `npm run check-format`
- `npm run lint` with zero errors
- `npm run build`
- `npm run test` — 42 Playwright tests passed against the production preview and live collaboration server

Blockers:
- None for Phase 1 implementation.

Known risks:
- The inherited dependency lock reports npm audit findings that require production-impact triage before public deployment.
- The pinned upstream code still emits non-blocking lint warnings that should be addressed only when touched or shown to affect behavior.

Next:
- Build the manuscript-first application shell around the MyST editor, including the research-integrity side panel and first-class selection state for claims, figures, tables, and sections.
