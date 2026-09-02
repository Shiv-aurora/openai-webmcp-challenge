# Research Integrity Editor

> **Every claim in your paper stays connected to the research that produced it.**

Research Integrity Editor is a provenance-aware scientific writing environment being built for the OpenAI WebMCP Challenge. Researchers can write normally, inspect the evidence behind claims, see when manuscript content has drifted from the underlying research, and collaborate with an external agent through the live editor state.

The hackathon experience is centered on three workflows:

- **Research X-Ray** — reveal verified, stale, contradicted, unlinked, and review-required manuscript elements.
- **Verify This** — let an external research agent verify the current selection and return structured evidence inside the manuscript.
- **Research Diff** — review Git-like changes between linked research artifacts and what the paper currently says.

## Foundation and attribution

This repository incorporates the open-source [Antmicro MyST Editor](https://github.com/antmicro/myst-editor) as its scientific editing foundation. The imported upstream revision is pinned in [`NOTICE.md`](NOTICE.md). Antmicro's Apache-2.0 license is retained in [`LICENSE`](LICENSE), and its original README is preserved at [`docs/UPSTREAM_MYST_EDITOR.md`](docs/UPSTREAM_MYST_EDITOR.md).

The MyST editing engine, preview, collaboration, comments, suggestions, templates, and base diff capabilities come from the upstream project. The provenance model, research-integrity interface, Research X-Ray, Verify This, Research Diff, and WebMCP surface are hackathon-specific work in this repository.

## Project documents

- [`docs/VISION.md`](docs/VISION.md) — product north star and scope boundaries.
- [`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md) — phased implementation path.
- [`docs/STATUS.md`](docs/STATUS.md) — current verified state and exact next milestone.

## Local development

Use Node.js 20.

```bash
npm ci
npm run dev
```

Validation:

```bash
npm run check-format
npm run lint
npm run build
```

The application is under active hackathon development. Working behavior, validation evidence, and remaining work are recorded in `docs/STATUS.md`.
