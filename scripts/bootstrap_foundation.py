import json
import pathlib
import re

MANUSCRIPT = r"""---
title: Regime-Aware Volatility Forecasting
authors:
  - name: Research Integrity Demo Team
abstract: |
  We evaluate a regime-aware forecasting system across normal and stressed markets. This manuscript intentionally contains linked values that will later demonstrate verification and research-diff workflows.
---

# Regime-Aware Volatility Forecasting

## Abstract

Financial forecasting papers are frequently updated by copying values from experiment outputs into prose, tables, and figures. We evaluate a multi-signal forecasting system and report stronger performance during stressed market regimes. The manuscript currently reports an **18.2% improvement in stress-regime accuracy** over the baseline.

## 1. Introduction

A scientific manuscript should remain connected to the experiments that produced it. In this study, market news, technical signals, company fundamentals, events, and discussion data are combined to estimate next-day volatility. The central result is a measurable improvement during high-volatility periods.

## 2. Data

The study uses **481,000 market observations** after filtering and alignment. Data are divided chronologically to avoid leakage between training, validation, and evaluation windows.

## 3. Method

The forecasting model is optimized with AdamW using a learning rate of **3e-4**. Signals are combined only after each source-specific component produces an auditable intermediate result.

The objective is:

$$
\mathcal{L} = \frac{1}{N}\sum_{i=1}^{N}(y_i - \hat{y}_i)^2
$$

## 4. Results

| Evaluation regime | Baseline accuracy | Proposed accuracy | Relative improvement |
| --- | ---: | ---: | ---: |
| Normal | 71.4% | 75.1% | 5.2% |
| Stress | 59.3% | 70.1% | 18.2% |

The stress-regime result is the primary quantitative claim. Later project phases will connect this sentence and table row to the exact experiment output, evaluation script, metric, and commit that produced them.

## 5. Reproducibility

Every consequential number, method statement, table, and figure should carry inspectable provenance. The editor will surface whether each relationship is verified, stale, contradicted, unlinked, or awaiting review.

## 6. Conclusion

Research artifacts already contain the information needed to keep a manuscript current. The missing layer is a writing environment that preserves those relationships while leaving final scientific judgment with the researcher.
""".strip()


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if text.count(old) != 1:
        raise RuntimeError(f"Expected exactly one {label}; found {text.count(old)}")
    return text.replace(old, new, 1)


def update_demo_entrypoint() -> None:
    path = pathlib.Path("src/index.html")
    source = path.read_text()
    source = replace_once(source, "<title>MyST editor Demo</title>", "<title>Research Integrity Editor</title>", "demo page title")

    updated, count = re.subn(
        r"let exampleText = `.*?`;\n\s*console\.log\(",
        lambda _: f"let exampleText = `{MANUSCRIPT}`;\n      console.log(",
        source,
        count=1,
        flags=re.DOTALL,
    )
    if count != 1:
        raise RuntimeError(f"Expected one demo manuscript; replaced {count}")
    source = updated

    source = replace_once(source, 'id: "demo"', 'id: "research-integrity-editor"', "demo editor id")
    source = replace_once(
        source,
        'title: "[MyST Editor](https://github.com/antmicro/myst-editor/) demo",',
        'title: "Research Integrity Editor",',
        "editor title",
    )

    updated, count = re.subn(
        r"includeButtons: defaultButtons\.concat\(\[\s*\{.*?\},\s*\]\),",
        "includeButtons: defaultButtons,",
        source,
        count=1,
        flags=re.DOTALL,
    )
    if count != 1:
        raise RuntimeError(f"Expected one demo-only custom button; removed {count}")
    path.write_text(updated)


def apply_focused_upstream_lint_fixes() -> None:
    topbar_path = pathlib.Path("src/components/Topbar.jsx")
    topbar = topbar_path.read_text()
    topbar_path.write_text(replace_once(topbar, "<ExitIcon></ExitIcon>", "<ExitIcon />", "non-self-closing ExitIcon"))

    git_editor_path = pathlib.Path("src/myst-git/MystEditorGit.jsx")
    source = git_editor_path.read_text()
    replacement = "\n".join(
        [
            "async function setupFileConnections(repo, props, branch, commitHash, files, getText) {",
            "  return await Promise.all(",
            "    files.map(async (file) => {",
            "      const initialText = getText ? await getText(branch, { hash: commitHash }, file) : null;",
            "      return new Promise((res) => {",
            "        const client = new CollaborationClient(",
            "          {",
            "            wsUrl: props.collaboration.wsUrl,",
            "            room: `${repo}/${branch}/${commitHash}/${file}`,",
            '            mode: "websocket",',
            "            commentsEnabled: true,",
            "          },",
            "          { id: props.id },",
            "        );",
            "        effect(() => {",
            "          if (!client.ready.value) return;",
            "          res({ client, file, text: client.ytext.toString(), initialText });",
            "        });",
            "      });",
            "    }),",
            "  );",
            "}",
            "",
        ]
    )
    updated, count = re.subn(
        r"async function setupFileConnections\(repo, props, branch, commitHash, files, getText\) \{.*?\n\}\n?$",
        replacement,
        source,
        count=1,
        flags=re.DOTALL,
    )
    if count != 1:
        raise RuntimeError(f"Expected one setupFileConnections implementation; replaced {count}")
    git_editor_path.write_text(updated)


def update_package_metadata() -> None:
    package_path = pathlib.Path("package.json")
    package = json.loads(package_path.read_text())
    package.update(
        {
            "name": "research-integrity-editor",
            "version": "0.1.0",
            "description": "A provenance-aware scientific editor with a WebMCP agent control surface.",
            "private": True,
            "license": "Apache-2.0",
            "repository": {
                "type": "git",
                "url": "https://github.com/Shiv-aurora/openai-webmcp-challenge.git",
            },
        }
    )
    package_path.write_text(json.dumps(package, indent=2) + "\n")

    lock_path = pathlib.Path("package-lock.json")
    lock = json.loads(lock_path.read_text())
    lock["name"] = package["name"]
    lock["version"] = package["version"]
    root_package = lock.setdefault("packages", {}).setdefault("", {})
    root_package["name"] = package["name"]
    root_package["version"] = package["version"]
    lock_path.write_text(json.dumps(lock, indent=2) + "\n")


def main() -> None:
    update_demo_entrypoint()
    apply_focused_upstream_lint_fixes()
    update_package_metadata()
    pathlib.Path(".nvmrc").write_text("20\n")


if __name__ == "__main__":
    main()
