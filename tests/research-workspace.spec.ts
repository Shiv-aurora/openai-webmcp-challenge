import { expect, Page, test } from "@playwright/test";

const installWebMCPHarness = async (page: Page) => {
  await page.addInitScript(() => {
    const tools = new Map();
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        async registerTool(tool: any, options: any = {}) {
          if (tools.has(tool.name)) throw new Error(`Duplicate WebMCP tool: ${tool.name}`);
          tools.set(tool.name, tool);
          options.signal?.addEventListener("abort", () => tools.delete(tool.name), { once: true });
        },
        async getTools() {
          return Array.from(tools.values());
        },
      },
    });
    Object.defineProperty(window, "__webmcpTools", { configurable: true, value: tools });
  });
};

const loadWorkspace = async (page: Page) => {
  await installWebMCPHarness(page);
  await page.goto("/?collab=false&empty=true");
  await page.evaluate(() => localStorage.removeItem("myst/provenance/demo"));
  await page.reload();
  await page.waitForSelector(".cm-content");
  await expect.poll(async () => page.evaluate(() => (window as any).__webmcpTools?.size || 0)).toBe(37);
};

const executeTool = async (page: Page, name: string, input: Record<string, unknown> = {}) =>
  page.evaluate(
    async ({ toolName, args }) => {
      const tool = (window as any).__webmcpTools.get(toolName);
      if (!tool) throw new Error(`WebMCP tool is not registered: ${toolName}`);
      return tool.execute(args);
    },
    { toolName: name, args: input },
  );

const payload = (toolResult: any) => toolResult.structuredContent || JSON.parse(toolResult.content[0].text);

test.describe("Experiments → Evidence → Paper workspace", () => {
  test.beforeEach(async ({ page }) => loadWorkspace(page));

  test("opens a populated fictional project on first launch", async ({ page }) => {
    await page.goto("/?collab=false");
    await page.evaluate(() => localStorage.removeItem("myst/provenance/demo"));
    await page.reload();
    await page.getByTestId("nav-experiments").click();

    await expect(page.getByTestId("experiment-list-item")).toHaveCount(6);
    await expect(page.getByRole("heading", { name: "Run #254 · locked Astra evaluation" })).toBeVisible();
    await expect(page.getByTestId("run-performance-chart")).toBeVisible();
    await expect(page.getByTestId("metric-history-chart")).toContainText("8 logged steps");
    await expect(page.getByTestId("nav-evidence")).toContainText("10");
  });

  test("loads a bidirectional, demo-ready lifecycle without hiding the paper", async ({ page }) => {
    await page.getByTestId("nav-experiments").click();
    await expect(page.getByTestId("experiments-workspace")).toBeVisible();
    await page.getByTestId("load-lifecycle-demo").click();

    await expect(page.getByTestId("experiment-list-item")).toHaveCount(6);
    await expect(page.getByRole("heading", { name: "Run #254 · locked Astra evaluation" })).toBeVisible();
    await expect(page.getByText("reasoning_index", { exact: true })).toBeVisible();
    await expect(page.getByTestId("run-performance-chart")).toBeVisible();
    await expect(page.getByTestId("metric-history-chart")).toContainText("8 logged steps");

    await page.getByTestId("nav-evidence").click();
    await expect(page.getByTestId("evidence-workspace")).toBeVisible();
    await expect(page.getByTestId("evidence-list-item")).toHaveCount(10);
    await expect(page.getByText("RUN", { exact: true })).toBeVisible();

    await page.getByTestId("nav-paper").click();
    await expect(page.locator(".cm-content")).toBeVisible();
    await page.getByTestId("activity-diff").click();
    await expect(page.getByTestId("research-diff-card")).toHaveCount(4);
  });

  test("lets a researcher record a run, publish evidence, and create a linked claim", async ({ page }) => {
    await page.getByTestId("nav-experiments").click();
    await page.getByRole("button", { name: "+ New run" }).click();
    await page.getByLabel("Run name").fill("Run #305 · ablation");
    await page.getByLabel("Method / model").fill("Regime-aware forecaster");
    await page.getByLabel("Source commit").fill("abc305f");
    await page.getByRole("button", { name: "Create experiment" }).click();

    await page.getByLabel("Metric name").fill("reasoning_index");
    await page.getByLabel("Metric value").fill("86.4%");
    await page.getByRole("button", { name: "Add metric" }).click();
    await page.getByTestId("publish-metric-evidence").click();

    await page.getByTestId("nav-evidence").click();
    await expect(page.getByTestId("evidence-list-item")).toHaveCount(1);
    await expect(page.getByText("reasoning_index=86.4%", { exact: true })).toBeVisible();
    await page.getByTestId("create-linked-claim").click();

    await expect
      .poll(() => page.evaluate(() => (window as any).myst_editor.demo.main_editor.state.doc.toString()))
      .toContain("Run #305 · ablation produced **reasoning_index=86.4%**.");
    const graph = await page.evaluate(() => (window as any).myst_editor.demo.state.provenance.data.peek());
    expect(graph.experiments).toHaveLength(1);
    expect(graph.evidence).toHaveLength(1);
    expect(graph.objects).toHaveLength(1);
    expect(graph.links).toHaveLength(1);
    expect(graph.links[0].evidenceId).toBe(graph.evidence[0].id);
  });

  test("exposes the same experiment lifecycle through WebMCP and creates a reviewable diff", async ({ page }) => {
    const oldRun = payload(
      await executeTool(page, "create_experiment", {
        id: "run-191",
        name: "Run #191",
        status: "completed",
        sourceCommit: "old191",
      }),
    ).experiment;
    await executeTool(page, "add_experiment_metric", { experimentId: oldRun.id, key: "reasoning_index", value: "76.9%" });
    const oldEvidence = payload(
      await executeTool(page, "create_experiment_evidence", {
        experimentId: oldRun.id,
        label: "Stress evaluation #191",
        metric: "reasoning_index=76.9%",
      }),
    ).evidence;

    const claimText = "76.9% on the Astra Reasoning Index";
    await page.evaluate((text) => {
      const view = (window as any).myst_editor.demo.main_editor;
      const from = view.state.doc.toString().indexOf(text);
      view.dispatch({ selection: { anchor: from, head: from + text.length }, scrollIntoView: true });
      view.focus();
    }, claimText);
    const claim = payload(await executeTool(page, "create_claim", { expectedText: claimText })).claim;
    await executeTool(page, "link_evidence_to_manuscript", { evidenceId: oldEvidence.id, objectId: claim.id, relation: "supports" });
    await executeTool(page, "verify_claim", { claimId: claim.id });

    const newRun = payload(
      await executeTool(page, "create_experiment", {
        id: "run-204",
        name: "Run #204",
        status: "completed",
        sourceCommit: "new204",
      }),
    ).experiment;
    await executeTool(page, "add_experiment_metric", { experimentId: newRun.id, key: "reasoning_index", value: "86.4%" });
    const history = payload(
      await executeTool(page, "log_experiment_metric_point", {
        experimentId: newRun.id,
        key: "validation_loss",
        value: 0.41,
        step: 12,
      }),
    );
    expect(history.metricHistory).toMatchObject([{ step: 12, value: 0.41 }]);
    await executeTool(page, "supersede_experiment", { olderExperimentId: oldRun.id, newerExperimentId: newRun.id });
    const newEvidence = payload(
      await executeTool(page, "create_experiment_evidence", {
        experimentId: newRun.id,
        label: "Stress evaluation #204",
        metric: "reasoning_index=86.4%",
        supersedesEvidenceId: oldEvidence.id,
      }),
    ).evidence;

    const diffs = payload(await executeTool(page, "get_research_diffs"));
    expect(diffs.researchDiffs).toHaveLength(1);
    expect(diffs.researchDiffs[0].changes[0].before).toBe("76.9%");
    expect(diffs.researchDiffs[0].changes[0].after).toBe("86.4%");

    const catalog = payload(await executeTool(page, "get_evidence_catalog"));
    expect(catalog.evidence.find((item: any) => item.id === newEvidence.id).manuscriptObjects[0].id).toBe(claim.id);
    const comparison = payload(await executeTool(page, "compare_experiments", { baseExperimentId: oldRun.id, candidateExperimentId: newRun.id }));
    expect(comparison.changes.metrics[0]).toEqual({ key: "reasoning_index", before: "76.9%", after: "86.4%" });

    const source = await page.evaluate(() => (window as any).myst_editor.demo.main_editor.state.doc.toString());
    expect(source).toContain("76.9% on the Astra Reasoning Index");
    expect(source).not.toContain("86.4% on the Astra Reasoning Index");
  });
});
