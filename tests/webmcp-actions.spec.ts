import { expect, Page, test } from "@playwright/test";

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

const loadWorkspace = async (page: Page, collaboration = false) => {
  await installWebMCPHarness(page);
  await page.goto(collaboration ? "/" : "/?collab=false");
  await page.evaluate(() => localStorage.removeItem("myst/provenance/demo"));
  await page.reload();
  await page.waitForSelector(".cm-content");
  if (collaboration) await page.waitForFunction(() => (window as any).myst_editor?.demo?.state?.collab?.value?.ready?.value === true);
  await expect.poll(async () => page.evaluate(() => (window as any).__webmcpTools?.size || 0)).toBe(19);
};

const selectText = async (page: Page, needle: string) => {
  await page.evaluate((text) => {
    const view = (window as any).myst_editor.demo.main_editor;
    const source = view.state.doc.toString();
    const from = source.indexOf(text);
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

const payload = (result: any) => result.structuredContent || JSON.parse(result.content[0].text);

const createStressClaim = async (page: Page) => {
  const text = "18.2% improvement in stress-regime accuracy";
  await selectText(page, text);
  const result = payload(await executeTool(page, "create_claim", { expectedText: text }));
  expect(result.ok).toBe(true);
  return { text, claim: result.claim };
};

test.describe("review-safe WebMCP actions", () => {
  test.beforeEach(async ({ page }) => loadWorkspace(page));

  test("registers the full Phase 4 surface with current WebMCP annotations", async ({ page }) => {
    const tools = await page.evaluate(async () => (document as any).modelContext.getTools());
    expect(tools).toHaveLength(19);

    const byName = new Map(tools.map((tool: any) => [tool.name, tool]));
    for (const name of [
      "create_claim",
      "attach_evidence",
      "update_evidence",
      "set_verification_state",
      "propose_claim_change",
      "insert_comment",
      "replace_selected_content",
      "navigate_to_object",
      "navigate_to_research_diff",
    ]) {
      expect((byName.get(name) as any)?.annotations?.readOnlyHint).toBe(false);
      expect((byName.get(name) as any)?.annotations?.untrustedContentHint).toBe(true);
    }
    expect((byName.get("get_research_diffs") as any)?.annotations?.readOnlyHint).toBe(true);
    expect((byName.get("get_research_diffs") as any)?.annotations?.untrustedContentHint).toBe(true);
  });

  test("creates a claim in the same provenance state the researcher sees", async ({ page }) => {
    const { claim } = await createStressClaim(page);
    await expect(page.getByTestId("provenance-object-count")).toHaveText("1");

    const read = payload(await executeTool(page, "get_claim"));
    expect(read.tracked).toBe(true);
    expect(read.claim.id).toBe(claim.id);
    expect(read.claim.text).toContain("18.2% improvement");
  });

  test("fails claim creation safely when the agent's selected text is stale", async ({ page }) => {
    const text = "18.2% improvement in stress-regime accuracy";
    await selectText(page, text);
    const before = await page.evaluate(() => JSON.stringify((window as any).myst_editor.demo.state.provenance.data.peek()));
    const result = await executeTool(page, "create_claim", { expectedText: "18.1% improvement in stress-regime accuracy" });
    const after = await page.evaluate(() => JSON.stringify((window as any).myst_editor.demo.state.provenance.data.peek()));

    expect(result.isError).toBe(true);
    expect(payload(result).error.code).toBe("STALE_SELECTION");
    expect(after).toBe(before);
  });

  test("attaches, updates, and verifies evidence through the live integrity state", async ({ page }) => {
    await createStressClaim(page);
    const attached = payload(
      await executeTool(page, "attach_evidence", {
        type: "experiment-result",
        label: "results/stress_eval.json",
        artifactId: "stress-eval-v7",
        metric: "stress_accuracy_improvement=18.2%",
        relation: "supports",
      }),
    );

    await expect(page.getByTestId("evidence-count")).toHaveText("1");
    await expect(page.getByTestId("selection-status")).toHaveText("Needs review");

    const updated = payload(
      await executeTool(page, "update_evidence", {
        evidenceId: attached.evidence.id,
        metric: "stress_accuracy_improvement=18.2%; n=481000",
        relation: "derived-from",
        notes: "Recomputed from the locked stress-regime evaluation artifact.",
      }),
    );
    expect(updated.evidence.metric).toContain("n=481000");
    expect(updated.link.relation).toBe("derived-from");

    const verified = payload(await executeTool(page, "set_verification_state", { verificationState: "verified" }));
    expect(verified.object.verificationState).toBe("verified");
    await expect(page.getByTestId("selection-status")).toHaveText("Verified");

    const provenance = payload(await executeTool(page, "get_provenance"));
    expect(provenance.evidence[0].evidence.notes).toContain("locked stress-regime evaluation artifact");
  });

  test("does not allow reviewed verification states without evidence", async ({ page }) => {
    await createStressClaim(page);
    const result = await executeTool(page, "set_verification_state", { verificationState: "verified" });
    expect(result.isError).toBe(true);
    expect(payload(result).error.code).toBe("EVIDENCE_REQUIRED");
    await expect(page.getByTestId("selection-status")).toHaveText("Unlinked");
  });

  test("stages a tracked claim rewrite for human accept or reject instead of silently applying it", async ({ page }) => {
    const { text, claim } = await createStressClaim(page);
    const replacement = "20.4% improvement in stress-regime accuracy";
    const result = payload(
      await executeTool(page, "propose_claim_change", {
        claimId: claim.id,
        expectedText: text,
        replacementText: replacement,
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.applied).toBe(false);
    expect(result.reviewRequired).toBe(true);
    const source = await page.evaluate(() => (window as any).myst_editor.demo.main_editor.state.doc.toString());
    expect(source).toContain(`{~~${text}~>${replacement}~~}`);

    const diffs = payload(await executeTool(page, "get_research_diffs"));
    expect(diffs.diffs).toHaveLength(1);
    expect(diffs.diffs[0].remove).toBe(text);
    expect(diffs.diffs[0].insert).toBe(replacement);
    await expect(page.getByTitle("Accept suggestion")).toBeVisible();
    await expect(page.getByTitle("Reject suggestion")).toBeVisible();
  });

  test("guards selected replacement with exact text and exposes the pending review diff", async ({ page }) => {
    const text = "The central result is a measurable improvement during high-volatility periods.";
    await selectText(page, text);
    const before = await page.evaluate(() => (window as any).myst_editor.demo.main_editor.state.doc.toString());
    const stale = await executeTool(page, "replace_selected_content", {
      expectedText: "The central result changed elsewhere.",
      replacementText: "A replacement that must not be staged.",
    });
    expect(stale.isError).toBe(true);
    expect(payload(stale).error.code).toBe("STALE_SELECTION");
    expect(await page.evaluate(() => (window as any).myst_editor.demo.main_editor.state.doc.toString())).toBe(before);

    const replacement = "The central result is strongest during high-volatility periods.";
    const staged = payload(await executeTool(page, "replace_selected_content", { expectedText: text, replacementText: replacement }));
    expect(staged.reviewRequired).toBe(true);
    expect(staged.applied).toBe(false);

    const diffs = payload(await executeTool(page, "get_research_diffs"));
    expect(diffs.diffs[0].remove).toBe(text);
    expect(diffs.diffs[0].insert).toBe(replacement);
  });

  test("navigates to tracked objects without changing manuscript or provenance content", async ({ page }) => {
    const { claim } = await createStressClaim(page);
    await selectText(page, "A scientific manuscript should remain connected to the experiments that produced it.");
    const beforeDoc = await page.evaluate(() => (window as any).myst_editor.demo.main_editor.state.doc.toString());
    const beforeProvenance = await page.evaluate(() => JSON.stringify((window as any).myst_editor.demo.state.provenance.data.peek()));

    const result = payload(await executeTool(page, "navigate_to_object", { objectId: claim.id }));
    expect(result.ok).toBe(true);
    expect(result.selection.snippet).toContain("18.2% improvement");
    expect(await page.evaluate(() => (window as any).myst_editor.demo.main_editor.state.doc.toString())).toBe(beforeDoc);
    expect(await page.evaluate(() => JSON.stringify((window as any).myst_editor.demo.state.provenance.data.peek()))).toBe(beforeProvenance);
  });

  test("navigates to a pending research diff without accepting it", async ({ page }) => {
    const text = "The central result is a measurable improvement during high-volatility periods.";
    await selectText(page, text);
    await executeTool(page, "replace_selected_content", {
      expectedText: text,
      replacementText: "The central result is strongest during high-volatility periods.",
    });
    const diffs = payload(await executeTool(page, "get_research_diffs"));
    const diff = diffs.diffs[0];

    const result = payload(await executeTool(page, "navigate_to_research_diff", { from: diff.from }));
    expect(result.ok).toBe(true);
    expect(result.reviewRequired).toBe(true);
    const selection = await page.evaluate(() => {
      const current = (window as any).myst_editor.demo.main_editor.state.selection.main;
      return { from: current.from, to: current.to };
    });
    expect(selection).toEqual({ from: diff.from, to: diff.to });
    expect(payload(await executeTool(page, "get_research_diffs")).diffs).toHaveLength(1);
  });
});

test("inserts an additive comment without overwriting an existing thread", async ({ page }) => {
  await loadWorkspace(page, true);
  const text = "18.2% improvement in stress-regime accuracy";
  await selectText(page, text);
  const first = payload(
    await executeTool(page, "insert_comment", { text: "Agent review: confirm this result against the locked evaluation artifact." }),
  );

  expect(first.ok).toBe(true);
  const stored = await page.evaluate((commentId) => {
    const ycomments = (window as any).myst_editor.demo.state.collab.value.ycomments;
    return {
      line: ycomments.positions().get(commentId),
      text: ycomments.getTextForComment(commentId).toString(),
    };
  }, first.comment.id);
  expect(Number(stored.line)).toBe(first.comment.line);
  expect(stored.text).toContain("confirm this result");

  const second = await executeTool(page, "insert_comment", { text: "This must not merge into the existing thread." });
  expect(second.isError).toBe(true);
  expect(payload(second).error.code).toBe("COMMENT_ALREADY_EXISTS");
});
