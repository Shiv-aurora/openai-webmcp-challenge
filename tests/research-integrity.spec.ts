import { expect, Page, test } from "@playwright/test";

const loadWorkspace = async (page: Page) => {
  await page.goto("/?collab=false");
  await page.evaluate(() => localStorage.removeItem("myst/provenance/demo"));
  await page.reload();
  await page.waitForSelector(".cm-content");
  await expect(page.getByTestId("integrity-panel")).toBeVisible();
};

const selectText = async (page: Page, needle: string) => {
  await page.evaluate((text) => {
    const api = (window as any).myst_editor.demo;
    const view = api.main_editor;
    const documentText = view.state.doc.toString();
    const from = documentText.indexOf(text);
    if (from < 0) throw new Error(`Unable to find selection text: ${text}`);
    view.dispatch({ selection: { anchor: from, head: from + text.length }, scrollIntoView: true });
    view.focus();
  }, needle);
};

const trackCurrentSelection = async (page: Page) => {
  await page.getByTestId("create-provenance-object").click();
  await expect(page.getByTestId("provenance-object")).toBeVisible();
};

const trackStressClaim = async (page: Page) => {
  const claim = "18.2% improvement in stress-regime accuracy";
  await selectText(page, claim);
  await trackCurrentSelection(page);
  return claim;
};

const addStressEvidence = async (page: Page) => {
  await page.getByTestId("evidence-label").fill("results/stress_eval.json");
  await page.getByTestId("evidence-artifact-id").fill("stress-eval-v7");
  await page.getByTestId("evidence-experiment-id").fill("stress-run-07");
  await page.getByTestId("evidence-commit").fill("a1b2c3d");
  await page.getByTestId("evidence-metric").fill("stress_accuracy_improvement=18.2%");
  await page.getByTestId("evidence-uri").fill("experiments/stress/results.json");
  await page.getByTestId("evidence-notes").fill("Evaluation output produced by the stress-regime benchmark.");
  await page.getByTestId("save-evidence").click();
};

test.describe("Research integrity workspace", () => {
  test.beforeEach(async ({ page }) => loadWorkspace(page));

  test("shows an honest manuscript-level integrity summary", async ({ page }) => {
    await expect(page.getByText("Research integrity", { exact: true })).toBeVisible();
    await expect(page.getByText("0 linked", { exact: true })).toBeVisible();
    await expect(page.getByTestId("provenance-object-count")).toHaveText("0");
    await expect(page.getByTestId("evidence-count")).toHaveText("0");
    await expect(page.getByTestId("manuscript-section-count")).toHaveText("8");
    await expect.poll(async () => Number(await page.getByTestId("manuscript-word-count").textContent())).toBeGreaterThan(150);
  });

  test("recognizes a selected quantitative claim", async ({ page }) => {
    const claim = "18.2% improvement in stress-regime accuracy";
    await selectText(page, claim);

    await expect(page.getByTestId("selection-kind")).toHaveText("Claim");
    await expect(page.getByTestId("selection-status")).toHaveText("Unlinked");
    await expect(page.getByTestId("selection-snippet")).toContainText(claim);
  });

  test("recognizes a selected method statement", async ({ page }) => {
    const method = "The forecasting model is optimized with AdamW using a learning rate of **3e-4**.";
    await selectText(page, method);

    await expect(page.getByTestId("selection-kind")).toHaveText("Method");
    await expect(page.getByTestId("selection-status")).toHaveText("Unlinked");
    await expect(page.getByTestId("selection-snippet")).toContainText("AdamW");
    await expect(page.getByTestId("integrity-panel").getByText("3. Method", { exact: true })).toBeVisible();
  });

  test("recognizes a table as a first-class selection context", async ({ page }) => {
    await selectText(page, "| Stress | 59.3% | 70.1% | 18.2% |");

    await expect(page.getByTestId("selection-kind")).toHaveText("Table");
    await expect(page.getByTestId("selection-status")).toHaveText("Unlinked");
    await expect(page.getByTestId("selection-snippet")).toContainText("Stress");
  });

  test("recognizes a figure as a first-class selection context", async ({ page }) => {
    const figure = "![Stress-regime accuracy](stress-regime-accuracy.svg)";
    await page.evaluate((figureText) => {
      const view = (window as any).myst_editor.demo.main_editor;
      const insertAt = view.state.doc.length;
      const insertion = `\n\n${figureText}\n`;
      view.dispatch({
        changes: { from: insertAt, insert: insertion },
        selection: { anchor: insertAt + 2, head: insertAt + 2 + figureText.length },
        scrollIntoView: true,
      });
      view.focus();
    }, figure);

    await expect(page.getByTestId("selection-kind")).toHaveText("Figure");
    await expect(page.getByTestId("selection-status")).toHaveText("Unlinked");
    await expect(page.getByTestId("selection-snippet")).toContainText("Stress-regime accuracy");
  });

  test("recognizes section context from the cursor", async ({ page }) => {
    await page.evaluate(() => {
      const view = (window as any).myst_editor.demo.main_editor;
      const documentText = view.state.doc.toString();
      const from = documentText.indexOf("## 4. Results");
      view.dispatch({ selection: { anchor: from + 4 }, scrollIntoView: true });
      view.focus();
    });

    await expect(page.getByTestId("selection-kind")).toHaveText("Section");
    await expect(page.getByTestId("selection-status")).toHaveText("Context only");
    await expect(page.getByTestId("selection-snippet")).toContainText("4. Results");
  });

  test("closes and restores the panel from the editor toolbar", async ({ page }) => {
    await page.getByRole("button", { name: "Close research integrity panel" }).click();
    await expect(page.getByTestId("integrity-panel")).toHaveCount(0);

    await page.locator('button[name="integrity-panel"]').click();
    await expect(page.getByTestId("integrity-panel")).toBeVisible();
  });

  test("creates a durable first-class quantitative claim from the current selection", async ({ page }) => {
    const claim = await trackStressClaim(page);

    await expect(page.getByTestId("tracked-object-kind")).toHaveText("Quantitative claim");
    await expect(page.getByTestId("provenance-object-count")).toHaveText("1");
    await expect(page.getByTestId("selection-status")).toHaveText("Unlinked");
    await expect(page.getByTestId("provenance-object")).toContainText(claim);

    const exposedState = await page.evaluate(() => {
      const store = (window as any).myst_editor.demo.state.provenance;
      return { objects: store.data.value.objects.length, kind: store.data.value.objects[0].kind };
    });
    expect(exposedState).toEqual({ objects: 1, kind: "claim" });
  });

  test("allows ordinary selected text to be manually marked as a claim", async ({ page }) => {
    const sentence = "This sentence is manually marked for provenance.";
    await page.evaluate((text) => {
      const view = (window as any).myst_editor.demo.main_editor;
      const insertAt = view.state.doc.length;
      const insertion = `\n\n${text}\n`;
      view.dispatch({
        changes: { from: insertAt, insert: insertion },
        selection: { anchor: insertAt + 2, head: insertAt + 2 + text.length },
        scrollIntoView: true,
      });
      view.focus();
    }, sentence);

    await expect(page.getByTestId("selection-kind")).toHaveText("Text");
    await expect(page.getByTestId("create-provenance-object")).toHaveText("Mark as claim");
    await trackCurrentSelection(page);
    await expect(page.getByTestId("tracked-object-kind")).toHaveText("Claim");
  });

  test("links structured research evidence and allows verification review", async ({ page }) => {
    await trackStressClaim(page);
    await addStressEvidence(page);

    await expect(page.getByTestId("linked-object-count")).toHaveText("1 linked");
    await expect(page.getByTestId("evidence-count")).toHaveText("1");
    await expect(page.getByTestId("evidence-card")).toContainText("results/stress_eval.json");
    await expect(page.getByTestId("evidence-card")).toContainText("stress-run-07");
    await expect(page.getByTestId("evidence-card")).toContainText("a1b2c3d");
    await expect(page.getByTestId("evidence-card")).toContainText("stress_accuracy_improvement=18.2%");
    await expect(page.getByTestId("selection-status")).toHaveText("Needs review");

    await page.getByTestId("verification-state").selectOption("verified");
    await expect(page.getByTestId("selection-status")).toHaveText("Verified");
  });

  test("edits and removes provenance evidence without losing the tracked object", async ({ page }) => {
    await trackStressClaim(page);
    await addStressEvidence(page);

    await page.getByRole("button", { name: "Edit evidence results/stress_eval.json" }).click();
    await page.getByTestId("evidence-metric").fill("stress_accuracy_improvement=16.8%");
    await page.getByTestId("evidence-relation").selectOption("derived-from");
    await page.getByTestId("save-evidence").click();

    await expect(page.getByTestId("evidence-card")).toContainText("16.8%");
    await expect(page.getByTestId("evidence-card")).toContainText("Derived From");

    await page.getByRole("button", { name: "Remove evidence results/stress_eval.json" }).click();
    await expect(page.getByTestId("evidence-count")).toHaveText("0");
    await expect(page.getByTestId("provenance-object-count")).toHaveText("1");
    await expect(page.getByTestId("selection-status")).toHaveText("Unlinked");
  });

  test("persists provenance objects and evidence across reloads", async ({ page }) => {
    const claim = await trackStressClaim(page);
    await addStressEvidence(page);
    await page.getByTestId("verification-state").selectOption("verified");

    await page.reload();
    await page.waitForSelector(".cm-content");
    await expect(page.getByTestId("integrity-panel")).toBeVisible();
    await expect(page.getByTestId("provenance-object-count")).toHaveText("1");
    await expect(page.getByTestId("evidence-count")).toHaveText("1");

    await selectText(page, claim);
    await expect(page.getByTestId("tracked-object-kind")).toHaveText("Quantitative claim");
    await expect(page.getByTestId("selection-status")).toHaveText("Verified");
    await expect(page.getByTestId("evidence-card")).toContainText("results/stress_eval.json");
  });

  test("removes a provenance object and its evidence relationship", async ({ page }) => {
    await trackStressClaim(page);
    await addStressEvidence(page);

    await page.getByRole("button", { name: "Remove tracked claim" }).click();
    await expect(page.getByTestId("provenance-object-count")).toHaveText("0");
    await expect(page.getByTestId("evidence-count")).toHaveText("0");
    await expect(page.getByTestId("selection-status")).toHaveText("Unlinked");
    await expect(page.getByTestId("create-provenance-object")).toBeVisible();
  });

  test("turns the manuscript into Research X-Ray in one interaction", async ({ page }) => {
    await trackStressClaim(page);
    await addStressEvidence(page);
    await page.getByTestId("verification-state").selectOption("verified");

    await page.getByTestId("toggle-xray").click();

    await expect(page.getByRole("heading", { name: "Research X-Ray", exact: true })).toBeVisible();
    await expect(page.getByTestId("xray-summary")).toBeVisible();
    await expect(page.getByTestId("xray-count-verified")).toHaveText("1");
    await expect.poll(async () => page.locator(".cm-xray-verified").count()).toBeGreaterThan(0);
    const verifiedObjectIds = await page
      .locator('[data-xray-state="verified"]')
      .evaluateAll((nodes) => [...new Set(nodes.map((node) => node.getAttribute("data-xray-object-id")))].filter(Boolean));
    expect(verifiedObjectIds).toHaveLength(1);
    await expect.poll(async () => (await page.locator('[data-xray-state="verified"]').allTextContents()).join("")).toContain("18.2% improvement");

    await page.getByTestId("toggle-xray").click();
    await expect(page.locator(".cm-xray-object")).toHaveCount(0);
  });

  test("distinguishes all five integrity states across claims, methods, tables, and figures", async ({ page }) => {
    const figure = "![Stress-regime accuracy](stress-regime-accuracy.svg)";
    await page.evaluate((figureText) => {
      const view = (window as any).myst_editor.demo.main_editor;
      const insertAt = view.state.doc.length;
      view.dispatch({ changes: { from: insertAt, insert: `\n\n${figureText}\n` } });
    }, figure);

    const objects = [
      { needle: "18.2% improvement in stress-regime accuracy", kind: "claim", state: "verified", label: "claim evidence" },
      {
        needle: "The forecasting model is optimized with AdamW using a learning rate of **3e-4**.",
        kind: "method",
        state: "needs-review",
        label: "method evidence",
      },
      { needle: "| Stress | 59.3% | 70.1% | 18.2% |", kind: "table", state: "stale", label: "table evidence" },
      { needle: figure, kind: "figure", state: "contradicted", label: "figure evidence" },
      { needle: "481,000 market observations", kind: "claim", state: "unlinked", label: null },
    ];

    for (const item of objects) {
      await selectText(page, item.needle);
      await page.getByTestId("create-provenance-object").click();
      await page.evaluate(({ state, label }) => {
        const store = (window as any).myst_editor.demo.state.provenance;
        const selection = (window as any).myst_editor.demo.state.manuscriptSelection.value;
        const object = store.findObjectForSelection(selection);
        if (label) store.addEvidence(object.id, { label, type: "result-file", relation: "supports" });
        if (state !== "unlinked") store.updateObject(object.id, { verificationState: state });
      }, item);
    }

    await page.getByTestId("toggle-xray").click();

    const stateLabels = {
      verified: "Verified",
      "needs-review": "Needs review",
      stale: "Stale",
      contradicted: "Contradicted",
      unlinked: "Unlinked",
    };

    for (const state of ["verified", "needs-review", "stale", "contradicted", "unlinked"]) {
      await expect(page.getByTestId(`xray-count-${state}`)).toHaveText("1");
      await page.getByTestId("xray-item").filter({ hasText: stateLabels[state] }).click();
      await expect.poll(async () => page.locator(`.cm-xray-${state}`).count()).toBeGreaterThan(0);
      const renderedObjectIds = await page
        .locator(`[data-xray-state="${state}"]`)
        .evaluateAll((nodes) => [...new Set(nodes.map((node) => node.getAttribute("data-xray-object-id")))].filter(Boolean));
      expect(renderedObjectIds).toHaveLength(1);
    }
    await expect(page.getByTestId("xray-item")).toHaveCount(5);
    await expect(page.getByTestId("xray-list")).toContainText("Quantitative claim");
    await expect(page.getByTestId("xray-list")).toContainText("Method");
    await expect(page.getByTestId("xray-list")).toContainText("Table");
    await expect(page.getByTestId("xray-list")).toContainText("Figure");
  });

  test("navigates from an X-Ray item back to its manuscript provenance", async ({ page }) => {
    const method = "The forecasting model is optimized with AdamW using a learning rate of **3e-4**.";
    await selectText(page, method);
    await trackCurrentSelection(page);
    await page.getByTestId("evidence-label").fill("configs/train.yaml");
    await page.getByTestId("save-evidence").click();
    await page.getByTestId("verification-state").selectOption("stale");

    await selectText(page, "The central result is a measurable improvement during high-volatility periods.");
    await page.getByTestId("toggle-xray").click();
    await page.getByRole("button", { name: "Inspect Method Stale" }).click();

    await expect(page.getByTestId("selection-kind")).toHaveText("Method");
    await expect(page.getByTestId("selection-status")).toHaveText("Stale");
    await expect(page.getByTestId("provenance-object")).toContainText("AdamW");
    await expect(page.getByTestId("evidence-card")).toContainText("configs/train.yaml");
  });
});
