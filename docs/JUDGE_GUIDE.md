# Two-minute judge guide

## 0:00 — Load a real research state

Open the application and click **Start the deterministic demo** in the right-hand Research Integrity panel. The graph loads five tracked objects and five linked evidence records from the checked-in `demo-research/` project.

## 0:15 — Research X-Ray

Click **Enter X-Ray**. The manuscript immediately shows one verified object, three stale objects, and one contradicted claim. Click any item in the X-Ray list to jump to its exact manuscript range and inspect its evidence.

## 0:40 — Verify This

Select **481,000 market observations** and click **Verify This**: the linked dataset manifest verifies it. Select **18.2% improvement in stress-regime accuracy** and verify again: the current result says **16.8%**, so the editor reports a contradiction with the evidence and reason.

## 1:10 — Research Diff

Use the sticky **Research Diff** workflow button. Four review cards cover claim, method, table, and figure drift. Inspect the method change from **3e-4** to **2e-4**. Choose **Accept → review**: the correction appears as a visible inline suggestion. Only the researcher can press the manuscript's accept control.

## 1:40 — WebMCP

In a WebMCP-capable browser, ask the connected agent to:

1. call `get_integrity_status`;
2. call `get_research_diffs`;
3. navigate to `research-diff-demo-object-method`;
4. stage that diff for review.

The editor and agent share the same live state; the agent navigates and stages, while the researcher retains acceptance authority.

## What to notice

- This is a complete human editor without an agent.
- Provenance covers claims, methods, tables, and figures—not just citations.
- The demo is deterministic and requires no model or API key.
- WebMCP is the central context/control layer, not a decorative chat button.
