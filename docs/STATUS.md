# Status

Current phase: Phase 11 — complete and publicly deployed.

## Completed phases

- **0–4:** attributed MyST Editor foundation, human scientific-editor workflow, provenance-native claims/methods/tables/figures, Research X-Ray, and the initial WebMCP surface.
- **5 — Verify This:** deterministic evidence-backed verification with explicit verified, contradicted, stale, missing-evidence, partially-supported, and needs-review outcomes. External conclusions cannot rewrite manuscript text.
- **6 — Research Diff:** live evidence-driven drift detection for results, methods/configuration, tables, figures, and artifact identity; grouped review state; visible CriticMarkup staging; human-only acceptance.
- **7 — Figures, tables, and methods:** first-class provenance and consistent stale/contradicted/review states across all object kinds.
- **8 — Demo project:** checked-in versioned results, configs, table data, dataset and figure manifests, two generated figures, five provenance objects, and five evidence records. The one-click demo deterministically reproduces all three core experiences.
- **9 — Product polish:** prominent product promise, sticky workflow navigation, direct demo entry point, honest empty/result states, corrected front-matter cursor behavior and LaTeX source, and tested 1366×768 layout.
- **10 — WebMCP reliability:** 23 live tools with current registration/annotation shape, lifecycle cleanup, explicit input schemas and structured failures, stale-context guards, evidence gating, non-mutating navigation, additive comments, and review-only manuscript writes.
- **11 — Submission story:** judge-first README, two-minute walkthrough, demo script, WebMCP reference, deployment guide, security/limitations disclosure, attribution, license, and GitHub Pages workflow.

## Last verified

- `npm ci`
- `npm run check-format`
- `npm run lint` — 0 errors; 16 inherited non-blocking hook/JSDoc warnings
- `npm run build` — production bundle succeeds with a deterministic Node heap budget
- Playwright — **102/102 passed** against the production preview and live collaboration server
- Focused release suite — **23/23 passed** for demo, Research Diff, WebMCP action/error boundaries, and laptop layout
- Real in-app browser — all 23 tools registered; live integrity/diff reads succeeded; WebMCP diff navigation moved the visible manuscript selection without changing content
- GitHub Actions — CI and Pages deployment succeeded on the release commit
- Public deployment — `https://shiv-aurora.github.io/openai-webmcp-challenge/` returned HTTP 200 and passed a live UI smoke test (5 objects, 5 evidence records, 4 Research Diffs, 23 WebMCP tools)
- `npm audit --omit=dev` — critical findings reduced from 2 to 0; 14 inherited production-tree advisories remain documented in `docs/SECURITY.md`

## Known limitations

- Provenance, verification, and Research Diff review state are browser-local and are not synchronized by the inherited collaboration server.
- Verification intentionally handles deterministic quantitative comparisons, not arbitrary scientific reasoning; an external agent can record a reasoned evidence-backed outcome through WebMCP.
- The WebMCP API is a moving draft. The current registration and annotations match the W3C Community Group draft checked for this release.
- A final smoke test in the challenge's supported Chrome WebMCP build remains an environment-specific manual check; the same registered tools are covered by automated invocation tests and were exercised in the real in-app browser.
- The inherited Markdown/YAML/polyfill dependency tree retains non-critical advisories; threat boundaries and mitigations are documented.

## Submission readiness

Source, license, attribution, deterministic demo, automated tests, green CI, verified public deployment, judge instructions, and accurate limitation disclosures are present. The repository and live product are ready to submit; the only remaining operations are the external hackathon form and final video upload.
