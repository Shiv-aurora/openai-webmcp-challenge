import { expect, Page, test } from "@playwright/test";

const READ_TOOL_NAMES = [
  "get_claim",
  "get_current_section",
  "get_current_selection",
  "get_figure",
  "get_integrity_status",
  "get_manuscript_context",
  "get_navigation_targets",
  "get_provenance",
  "get_table",
];

const installWebMCPHarness = async (page: Page) => {
  await page.addInitScript(() => {
    const tools = new Map();
    const modelContext = {
      async registerTool(tool: any, options: any = {}) {
        if (tools.has(tool.name)) throw new Error(`Duplicate WebMCP tool: ${tool.name}`);
        tools.set(tool.name, tool);
        options.signal?.addEventListener("abort", () => tools.delete(tool.name), { once: true });
      },
      async getTools() {
        return Array.from(tools.values()).map((tool: any) => ({
          name: tool.name,
          title: tool.title,
          description: tool.description,
          inputSchema: tool.inputSchema,
          annotations: tool.annotations,
        }));
      },
    };

    Object.defineProperty(document, "modelContext", { configurable: true, value: modelContext });
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

const selectText = async (page: Page, needle: string) => {
  await page.getByTestId("activity-verify").click();
  await page.evaluate((text) => {
    const view = (window as any).myst_editor.demo.main_editor;
    const documentText = view.state.doc.toString();
    const from = documentText.indexOf(text);
    if (from < 0) throw new Error(`Unable to find selection text: ${text}`);
    view.dispatch({ selection: { anchor: from, head: from + text.length }, scrollIntoView: true });
    view.focus();
  }, needle);
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

const structuredPayload = (result: any) => result.structuredContent || JSON.parse(result.content[0].text);

test.describe("read-only WebMCP surface", () => {
  test.beforeEach(async ({ page }) => loadWorkspace(page));

  test("registers the Phase 4 read tools with safe WebMCP annotations", async ({ page }) => {
    const tools = await page.evaluate(async () => (document as any).modelContext.getTools());
    const readTools = tools.filter((tool: any) => READ_TOOL_NAMES.includes(tool.name));

    expect(readTools.map((tool: any) => tool.name).sort()).toEqual([...READ_TOOL_NAMES].sort());
    expect(readTools.every((tool: any) => tool.annotations?.readOnlyHint === true)).toBe(true);
    expect(readTools.every((tool: any) => tool.annotations?.untrustedContentHint === true)).toBe(true);
  });

  test("reads the live selection instead of a registration-time snapshot", async ({ page }) => {
    await selectText(page, "76.9% on the Astra Reasoning Index");
    let payload = structuredPayload(await executeTool(page, "get_current_selection"));
    expect(payload.selection.kind).toBe("claim");
    expect(payload.selection.snippet).toContain("76.9% on the Astra Reasoning Index");

    await selectText(page, "GPT-6 Astra is optimized with AdamW using a peak learning rate of **2.4e-4**.");
    payload = structuredPayload(await executeTool(page, "get_current_selection"));
    expect(payload.selection.kind).toBe("method");
    expect(payload.selection.snippet).toContain("AdamW");
  });

  test("returns current section manuscript context and integrity summary", async ({ page }) => {
    await selectText(page, "76.9% on the Astra Reasoning Index");
    const payload = structuredPayload(await executeTool(page, "get_manuscript_context", { scope: "section", maxChars: 2000 }));

    expect(payload.ok).toBe(true);
    expect(payload.scope).toBe("section");
    expect(payload.selection.section.title).toBe("Abstract");
    expect(payload.context.content).toContain("## Abstract");
    expect(payload.context.content).toContain("76.9% on the Astra Reasoning Index");
    expect(payload.document.wordCount).toBeGreaterThan(150);
    expect(payload.integrity.objectCount).toBe(0);
  });

  test("returns a selected claim and its provenance without mutating researcher state", async ({ page }) => {
    await selectText(page, "76.9% on the Astra Reasoning Index");
    await page.getByTestId("create-provenance-object").click();
    await page.getByTestId("evidence-label").fill("results/stress_eval.json");
    await page.getByTestId("evidence-artifact-id").fill("stress-eval-v7");
    await page.getByTestId("evidence-metric").fill("reasoning_index=76.9%");
    await page.getByTestId("save-evidence").click();

    const before = await page.evaluate(() => JSON.stringify((window as any).myst_editor.demo.state.provenance.data.peek()));
    const claim = structuredPayload(await executeTool(page, "get_claim"));
    const provenance = structuredPayload(await executeTool(page, "get_provenance"));
    const after = await page.evaluate(() => JSON.stringify((window as any).myst_editor.demo.state.provenance.data.peek()));

    expect(claim.ok).toBe(true);
    expect(claim.tracked).toBe(true);
    expect(claim.claim.kind).toBe("claim");
    expect(claim.claim.text).toContain("76.9% on the Astra Reasoning Index");
    expect(claim.evidence).toHaveLength(1);
    expect(claim.evidence[0].evidence.label).toBe("results/stress_eval.json");
    expect(provenance.object.id).toBe(claim.claim.id);
    expect(provenance.evidence[0].evidence.artifactId).toBe("stress-eval-v7");
    expect(provenance.evidence[0].evidence.metric).toBe("reasoning_index=76.9%");
    expect(after).toBe(before);
  });

  test("returns explicit structured errors when claim or provenance context is missing", async ({ page }) => {
    await selectText(page, "Everything here is synthetic.");

    const claimResult = await executeTool(page, "get_claim");
    const provenanceResult = await executeTool(page, "get_provenance");
    const claim = structuredPayload(claimResult);
    const provenance = structuredPayload(provenanceResult);

    expect(claimResult.isError).toBe(true);
    expect(claim.error.code).toBe("NO_CLAIM_SELECTED");
    expect(provenanceResult.isError).toBe(true);
    expect(provenance.error.code).toBe("PROVENANCE_NOT_FOUND");
  });

  test("reads the selected table without requiring provenance", async ({ page }) => {
    await selectText(page, "| Astra MoE candidate | 76.9% | 81.2% | 92.6% |");
    const before = await page.evaluate(() => JSON.stringify((window as any).myst_editor.demo.state.provenance.data.peek()));
    const payload = structuredPayload(await executeTool(page, "get_table"));
    const after = await page.evaluate(() => JSON.stringify((window as any).myst_editor.demo.state.provenance.data.peek()));

    expect(payload.ok).toBe(true);
    expect(payload.tracked).toBe(false);
    expect(payload.table.kind).toBe("table");
    expect(payload.table.text).toContain("Astra MoE candidate");
    expect(payload.evidence).toHaveLength(0);
    expect(after).toBe(before);
  });

  test("reads the selected figure and later resolves the same figure by tracked id", async ({ page }) => {
    const figure = "![Stress-regime accuracy](stress-regime-accuracy.svg)";
    await page.evaluate((figureText) => {
      const view = (window as any).myst_editor.demo.main_editor;
      const insertAt = view.state.doc.length;
      view.dispatch({ changes: { from: insertAt, insert: `\n\n${figureText}\n` } });
    }, figure);
    await selectText(page, figure);

    let payload = structuredPayload(await executeTool(page, "get_figure"));
    expect(payload.ok).toBe(true);
    expect(payload.tracked).toBe(false);
    expect(payload.figure.kind).toBe("figure");

    await page.getByTestId("create-provenance-object").click();
    payload = structuredPayload(await executeTool(page, "get_figure"));
    expect(payload.tracked).toBe(true);

    const byId = structuredPayload(await executeTool(page, "get_figure", { figureId: payload.figure.id }));
    expect(byId.figure.id).toBe(payload.figure.id);
    expect(byId.figure.text).toContain("stress-regime-accuracy.svg");
  });

  test("returns the named current section and its exact live section text", async ({ page }) => {
    await selectText(page, "76.9% on the Astra Reasoning Index");
    const payload = structuredPayload(await executeTool(page, "get_current_section"));

    expect(payload.ok).toBe(true);
    expect(payload.section.title).toBe("Abstract");
    expect(payload.context.content).toContain("## Abstract");
    expect(payload.context.content).toContain("76.9% on the Astra Reasoning Index");
    expect(payload.context.content).not.toContain("## Methods");
  });

  test("reports integrity status and filtered navigation targets without mutating provenance", async ({ page }) => {
    await selectText(page, "76.9% on the Astra Reasoning Index");
    await page.getByTestId("create-provenance-object").click();
    await page.getByTestId("evidence-label").fill("results/stress_eval.json");
    await page.getByTestId("save-evidence").click();
    await page.getByTestId("verification-state").selectOption("verified");

    await selectText(page, "GPT-6 Astra is optimized with AdamW using a peak learning rate of **2.4e-4**.");
    await page.getByTestId("create-provenance-object").click();
    await page.getByTestId("evidence-label").fill("configs/train.yaml");
    await page.getByTestId("save-evidence").click();
    await page.getByTestId("verification-state").selectOption("stale");

    const before = await page.evaluate(() => JSON.stringify((window as any).myst_editor.demo.state.provenance.data.peek()));
    const integrity = structuredPayload(await executeTool(page, "get_integrity_status"));
    const targets = structuredPayload(await executeTool(page, "get_navigation_targets", { verificationState: "stale" }));
    const after = await page.evaluate(() => JSON.stringify((window as any).myst_editor.demo.state.provenance.data.peek()));

    expect(integrity.ok).toBe(true);
    expect(integrity.integrity.objectCount).toBe(2);
    expect(integrity.integrity.stateCounts.verified).toBe(1);
    expect(integrity.integrity.stateCounts.stale).toBe(1);
    expect(integrity.objects).toHaveLength(2);
    expect(targets.ok).toBe(true);
    expect(targets.targets).toHaveLength(1);
    expect(targets.targets[0].kind).toBe("method");
    expect(targets.targets[0].verificationState).toBe("stale");
    expect(targets.targets[0].anchor.sectionTitle).toBe("3. Architecture and optimization");
    expect(after).toBe(before);
  });

  test("returns explicit errors for missing figure, table, and section context", async ({ page }) => {
    await selectText(page, "Everything here is synthetic.");

    const figureResult = await executeTool(page, "get_figure");
    const tableResult = await executeTool(page, "get_table");
    const figure = structuredPayload(figureResult);
    const table = structuredPayload(tableResult);

    expect(figureResult.isError).toBe(true);
    expect(figure.error.code).toBe("NO_FIGURE_SELECTED");
    expect(tableResult.isError).toBe(true);
    expect(table.error.code).toBe("NO_TABLE_SELECTED");

    await page.evaluate(() => {
      const view = (window as any).myst_editor.demo.main_editor;
      view.dispatch({ selection: { anchor: 0 }, scrollIntoView: true });
      view.focus();
    });
    const sectionResult = await executeTool(page, "get_current_section");
    const section = structuredPayload(sectionResult);
    expect(sectionResult.isError).toBe(true);
    expect(section.error.code).toBe("NO_SECTION_CONTEXT");
  });
});
