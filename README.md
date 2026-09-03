# Potter's Wheel

> **From experiment to paper, without breaking provenance.**

Potter's Wheel is a provenance-aware research workspace for the OpenAI WebMCP Challenge. It connects experiment runs to durable evidence and the claims, methods, tables, and figures that depend on them—while keeping the researcher in control of every consequential manuscript edit.

The product model is deliberately narrow:

> **EXPERIMENTS → EVIDENCE → PAPER**

This is not experiment orchestration or a generic MLflow replacement. Runs matter because they explain what evidence the research produced and how that evidence affects the paper.

## Try the complete demo

```bash
npm ci
npm run build
npm run preview -- --host 127.0.0.1
```

Open `http://127.0.0.1:4173/?collab=false`, choose **Experiments**, and click **Load demo lifecycle**. You can navigate from Run #204 to its evidence, then to every stale manuscript dependency and Research Diff. No account, API key, model, or backend is required.

The demo deliberately contains four kinds of research drift:

- a manuscript claim says **18.2%**, while the current result is **16.8%**;
- the method says learning rate **3e-4**, while the current config says **2e-4**;
- a table still contains the previous stress-regime result;
- a figure points to the v1 output while provenance points to v2.

See the [two-minute judge guide](docs/JUDGE_GUIDE.md) and [demo video script](docs/DEMO_SCRIPT.md).

## The connected research lifecycle

### Experiments

Create and maintain research runs with status, method, parameters, metrics, datasets, artifacts, notes, source commits, timestamps, and supersession relationships. Compare runs and publish a result as evidence without leaving the workspace.

### Evidence

Inspect the bridge between a run and the paper. Each evidence record retains its experiment, result or configuration, artifact, commit, and manuscript usage. A researcher can create a linked claim, table, figure, or method statement, or attach the result to an existing manuscript object.

### Paper

The complete scientific editor remains intact, including comments, suggestions, collaboration, equations, tables, figures, templates, Research X-Ray, Verify This, and human-controlled Research Diff review.

## Three integrity experiences

### Research X-Ray

Turn the paper into a visual integrity map. Verified, stale, contradicted, unlinked, and review-required claims, methods, tables, and figures are highlighted directly in the manuscript, with inspectable evidence and manuscript-level counts.

### Verify This

Select a quantitative claim and run a deterministic, evidence-backed comparison. The verifier understands percentages, grouped numbers, decimals, and scientific notation, and reports honest `verified`, `contradicted`, `stale`, `missing-evidence`, `partially-supported`, or `needs-review` outcomes rather than guessing through ambiguous evidence.

### Research Diff

See a Git-like review of where live research has drifted from the paper. Each entry shows manuscript state beside current evidence. A researcher can inspect, defer, reject, or stage a deterministic correction. Staging creates visible CriticMarkup; the manuscript changes only after the researcher uses the editor's accept control.

## Why WebMCP

The editor owns live manuscript context and safe controls. The user's external agent owns broader research context and reasoning. Through 36 registered WebMCP tools, an agent can maintain experiment runs, publish and compare evidence, connect results to manuscript objects, inspect integrity state, verify claims, navigate, and stage reviewable corrections. It cannot silently accept its own rewrite.

The tools are registered with `document.modelContext.registerTool(tool, { signal })`, operate on the exact state visible to the human, return structured errors for stale or invalid context, and unregister with the editor lifecycle. The full contract and test examples are in [docs/WEBMCP.md](docs/WEBMCP.md).

## Human and agent responsibilities

| Researcher without an agent | External agent through WebMCP | Better together |
| --- | --- | --- |
| Record and compare experiments; publish and link evidence; write scientific Markdown; inspect X-Ray; review diffs; accept or reject changes | Maintain the same run/evidence graph; read live manuscript context; verify claims; navigate affected objects; add comments; stage corrections | Run outputs become manuscript-ready evidence at agent scale, while acceptance authority stays with the author |

## Foundation and attribution

This repository incorporates [Antmicro MyST Editor](https://github.com/antmicro/myst-editor) at pinned revision `c32e8e77f504a57aee253e07d4e7a44b8c8ecc30`. Its scientific editor, preview, collaboration, comments, suggestions, templates, and base diff capabilities are the foundation.

The experiment/evidence graph, lifecycle workspace, provenance model, research-integrity panel, Research X-Ray, Verify This, evidence-driven Research Diff, deterministic research fixture, and 36-tool WebMCP surface are challenge-specific work. See [NOTICE.md](NOTICE.md), [LICENSE](LICENSE), and the preserved [upstream README](docs/UPSTREAM_MYST_EDITOR.md).

## Development and validation

Node.js 20 is recommended.

```bash
npm ci
npm run check-format
npm run lint
npm run build
```

For the browser suite, start the production preview and collaboration server in separate terminals, then run Playwright:

```bash
npm run preview -- --host 127.0.0.1
PORT=4455 YPERSISTENCE=/tmp/myst-docs node bin/server.js
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright test -c tests/playwright.config.js
```

CI performs the same production-build and browser validation. Current verified state, limitations, and phase history are in [docs/STATUS.md](docs/STATUS.md); deployment details are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
