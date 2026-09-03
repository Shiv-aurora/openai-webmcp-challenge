import { expect, Page, test } from "@playwright/test";

const loadWorkspace = async (page: Page) => {
  await page.goto("/?collab=false");
  await page.evaluate(() => localStorage.removeItem("myst/provenance/demo"));
  await page.reload();
  await page.waitForSelector(".cm-content");
  await page.getByTestId("load-demo-research").click();
};

const selectText = async (page: Page, needle: string) => {
  await page.evaluate((text) => {
    const view = (window as any).myst_editor.demo.main_editor;
    const source = view.state.doc.toString();
    const from = source.indexOf(text);
    if (from < 0) throw new Error(`Unable to find demo text: ${text}`);
    view.dispatch({ selection: { anchor: from, head: from + text.length }, scrollIntoView: true });
    view.focus();
  }, needle);
};

test.describe("deterministic demo research project", () => {
  test.beforeEach(async ({ page }) => loadWorkspace(page));

  test("loads a complete provenance graph for claims, method, table, and figure", async ({ page }) => {
    await expect(page.getByTestId("provenance-object-count")).toHaveText("5");
    await expect(page.getByTestId("evidence-count")).toHaveText("5");
    await page.getByTestId("toggle-xray").click();
    await expect(page.getByTestId("xray-count-verified")).toHaveText("1");
    await expect(page.getByTestId("xray-count-stale")).toHaveText("3");
    await expect(page.getByTestId("xray-count-contradicted")).toHaveText("1");
    await expect(page.getByTestId("xray-item")).toHaveCount(5);
  });

  test("reproduces correct and incorrect Verify This outcomes", async ({ page }) => {
    await selectText(page, "481,000 market observations");
    await page.getByTestId("verify-this").click();
    await expect(page.getByTestId("verification-result")).toContainText("Verified");

    await selectText(page, "18.2% improvement in stress-regime accuracy");
    await page.getByTestId("verify-this").click();
    await expect(page.getByTestId("verification-result")).toContainText("Contradicted");
    await expect(page.getByTestId("verification-result")).toContainText("16.8%");
  });

  test("reproduces grouped claim, method, table, and figure Research Diffs", async ({ page }) => {
    await expect(page.getByTestId("research-diff-card")).toHaveCount(4);
    const list = page.getByTestId("research-diff-list");
    await expect(list).toContainText("Result value changed");
    await expect(list).toContainText("Method configuration changed");
    await expect(list).toContainText("Table results changed");
    await expect(list).toContainText("Figure source changed");
    await expect(list).toContainText("2e-4");
    await expect(list).toContainText("stress-regime-accuracy-v2.svg");
  });

  test("inspects the stale figure and its generating artifact", async ({ page }) => {
    await selectText(page, "![Stress-regime accuracy comparison](demo/stress-regime-accuracy-v1.svg)");
    await expect(page.getByTestId("selection-kind")).toHaveText("Figure");
    await expect(page.getByTestId("selection-status")).toHaveText("Stale");
    await expect(page.getByTestId("evidence-card")).toContainText("stress-regime-accuracy-v2.svg");
    await expect(page.getByTestId("evidence-card")).toContainText("stress-run-08");
  });
});
