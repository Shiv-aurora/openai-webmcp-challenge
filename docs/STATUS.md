# Status

Current phase: Phase 12 — Experiments → Evidence → Paper complete; release deployment validation in progress.

Current objective: publish and verify the integrated lifecycle workspace on the canonical `main` deployment.

## Completed phases

- **0–4:** attributed MyST Editor foundation, human scientific-editor workflow, provenance-native claims/methods/tables/figures, Research X-Ray, and the initial WebMCP surface.
- **5 — Verify This:** deterministic evidence-backed verification with explicit verified, contradicted, stale, missing-evidence, partially-supported, and needs-review outcomes. External conclusions cannot rewrite manuscript text.
- **6 — Research Diff:** live evidence-driven drift detection for results, methods/configuration, tables, figures, and artifact identity; grouped review state; visible CriticMarkup staging; human-only acceptance.
- **7 — Figures, tables, and methods:** first-class provenance and consistent stale/contradicted/review states across all object kinds.
- **8 — Demo project:** checked-in versioned results, configs, table data, dataset and figure manifests, two generated figures, five provenance objects, and five evidence records. The one-click demo deterministically reproduces all three core experiences.
- **9 — Product polish:** prominent product promise, sticky workflow navigation, direct demo entry point, honest empty/result states, corrected front-matter cursor behavior and LaTeX source, and tested 1366×768 layout.
- **10 — WebMCP reliability:** 23 live tools with current registration/annotation shape, lifecycle cleanup, explicit input schemas and structured failures, stale-context guards, evidence gating, non-mutating navigation, additive comments, and review-only manuscript writes.
- **11 — Submission story:** judge-first README, two-minute walkthrough, demo script, WebMCP reference, deployment guide, security/limitations disclosure, attribution, license, and GitHub Pages workflow.
- **12 — End-to-end research workspace:** first-class experiment runs, a standalone evidence catalog, bidirectional lifecycle navigation, manual result-to-paper actions, run/evidence supersession, experiment-aware Research X-Ray, and 13 experiment/evidence WebMCP tools.

## Last verified

- `npm ci`
- `npm run check-format`
- `npm run lint` — 0 errors; 16 inherited non-blocking hook/JSDoc warnings
- `npm run build` — production bundle succeeds with a deterministic Node heap budget
- Playwright — **105/105 passed** against the production preview and live collaboration server
- Focused lifecycle suite — **4/4 passed** for experiment creation, evidence publication, paper linkage, supersession, and laptop layout
- Real in-app browser — all **36 tools** registered; the run/evidence/paper trace and four Research Diffs are visible against shared live state
- Visual review — loaded Experiments and Evidence workspaces verified at 1440×900 and the two-column experiment layout verified at 768×900
- GitHub Actions — CI and Pages deployment succeeded on the prior release commit; the Phase 12 deployment is the remaining release check
- Public deployment — `https://shiv-aurora.github.io/openai-webmcp-challenge/` is the canonical target; Phase 12 live smoke testing remains pending until the new commit deploys
- `npm audit --omit=dev` — critical findings reduced from 2 to 0; 14 inherited production-tree advisories remain documented in `docs/SECURITY.md`

## Known limitations

- Experiments, evidence, provenance, verification, and Research Diff review state are browser-local and are not synchronized by the inherited collaboration server.
- Verification intentionally handles deterministic quantitative comparisons, not arbitrary scientific reasoning; an external agent can record a reasoned evidence-backed outcome through WebMCP.
- The WebMCP API is a moving draft. The current registration and annotations match the W3C Community Group draft checked for this release.
- A final smoke test in the challenge's supported Chrome WebMCP build remains an environment-specific manual check; the same registered tools are covered by automated invocation tests and were exercised in the real in-app browser.
- The inherited Markdown/YAML/polyfill dependency tree retains non-critical advisories; threat boundaries and mitigations are documented.

## Blockers

- None in the implementation. Phase 12 only needs the normal GitHub Actions and public Pages verification after push.

## Next

- Push the verified Phase 12 commit, wait for CI and Pages, and smoke-test the public Experiments → Evidence → Paper flow.

## Submission readiness

Source, license, attribution, deterministic lifecycle demo, automated tests, judge instructions, and accurate limitation disclosures are present. The local repository is submission-ready; the public Phase 12 deployment is the remaining release operation before the external hackathon form and final video upload.
