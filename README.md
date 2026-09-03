# Research Integrity Editor

> **Every claim in your paper stays connected to the research that produced it.**

Research Integrity Editor is a provenance-aware scientific writing environment for the OpenAI WebMCP Challenge. It turns the manuscript into a live view of the experiments, configurations, tables, figures, and decisions behind it—while keeping the researcher in control of every consequential edit.

## Try the complete demo

```bash
npm ci
npm run build
npm run preview -- --host 127.0.0.1
```

Open `http://127.0.0.1:4173/?collab=false`, open the Research Integrity panel if needed, and click **Start the deterministic demo**. No account, API key, model, or backend is required.

The demo deliberately contains four kinds of research drift:

- a manuscript claim says **18.2%**, while the current result is **16.8%**;
- the method says learning rate **3e-4**, while the current config says **2e-4**;
- a table still contains the previous stress-regime result;
- a figure points to the v1 output while provenance points to v2.

See the [two-minute judge guide](docs/JUDGE_GUIDE.md) and [demo video script](docs/DEMO_SCRIPT.md).

## Three core experiences

### Research X-Ray

Turn the paper into a visual integrity map. Verified, stale, contradicted, unlinked, and review-required claims, methods, tables, and figures are highlighted directly in the manuscript, with inspectable evidence and manuscript-level counts.

### Verify This

Select a quantitative claim and run a deterministic, evidence-backed comparison. The verifier understands percentages, grouped numbers, decimals, and scientific notation, and reports honest `verified`, `contradicted`, `stale`, `missing-evidence`, `partially-supported`, or `needs-review` outcomes rather than guessing through ambiguous evidence.

### Research Diff

See a Git-like review of where live research has drifted from the paper. Each entry shows manuscript state beside current evidence. A researcher can inspect, defer, reject, or stage a deterministic correction. Staging creates visible CriticMarkup; the manuscript changes only after the researcher uses the editor's accept control.

## Why WebMCP

The editor owns live manuscript context and safe controls. The user's external agent owns broader research context and reasoning. Through 23 registered WebMCP tools, an agent can read the selection, section, provenance, integrity state, and diffs; attach evidence; verify claims; add comments; navigate; and stage reviewable corrections. It cannot silently accept its own rewrite.

The tools are registered with `document.modelContext.registerTool(tool, { signal })`, operate on the exact state visible to the human, return structured errors for stale or invalid context, and unregister with the editor lifecycle. The full contract and test examples are in [docs/WEBMCP.md](docs/WEBMCP.md).

## Human and agent responsibilities

| Researcher without an agent | External agent through WebMCP | Better together |
| --- | --- | --- |
| Write and preview scientific Markdown; create claims; link evidence; inspect X-Ray; review diffs; accept or reject changes | Read live manuscript context; add structured evidence; run or record verification; navigate affected objects; add comments; stage corrections | The agent brings repository and experiment context into the exact passage the human is reviewing, while acceptance authority stays with the author |

## Foundation and attribution

This repository incorporates [Antmicro MyST Editor](https://github.com/antmicro/myst-editor) at pinned revision `c32e8e77f504a57aee253e07d4e7a44b8c8ecc30`. Its scientific editor, preview, collaboration, comments, suggestions, templates, and base diff capabilities are the foundation.

The provenance model, research-integrity panel, Research X-Ray, Verify This, evidence-driven Research Diff, deterministic research fixture, and 23-tool WebMCP surface are challenge-specific work. See [NOTICE.md](NOTICE.md), [LICENSE](LICENSE), and the preserved [upstream README](docs/UPSTREAM_MYST_EDITOR.md).

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
