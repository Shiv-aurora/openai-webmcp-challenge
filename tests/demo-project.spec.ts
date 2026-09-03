import { expect, Page, test } from "@playwright/test";

const loadWorkspace = async (page: Page) => {
  await page.goto("/?collab=false&empty=true");
  await page.evaluate(() => localStorage.removeItem("myst/provenance/demo"));
  await page.reload();
  await page.waitForSelector(".cm-content");
  await page.getByTestId("load-demo-research").click();
};

const selectText = async (page: Page, needle: string) => {
  await page.getByTestId("activity-verify").click();
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
    await expect(page.getByTestId("xray-item")).toHaveCount(5);
    await page.getByTestId("toggle-xray").click();
    await expect(page.getByTestId("xray-count-verified")).toHaveText("1");
    await expect(page.getByTestId("xray-count-stale")).toHaveText("3");
    await expect(page.getByTestId("xray-count-contradicted")).toHaveText("1");
    await expect(page.getByTestId("xray-item")).toHaveCount(5);
  });

  test("reproduces correct and incorrect Verify This outcomes", async ({ page }) => {
    await selectText(page, "2.4 trillion deduplicated tokens");
    await page.getByTestId("verify-this").click();
    await expect(page.getByTestId("verification-result")).toContainText("Verified");

    await selectText(page, "76.9% on the Astra Reasoning Index");
    await page.getByTestId("verify-this").click();
    await expect(page.getByTestId("verification-result")).toContainText("Contradicted");
    await expect(page.getByTestId("verification-result")).toContainText("78.4%");
  });

  test("reproduces grouped claim, method, table, and figure Research Diffs", async ({ page }) => {
    await page.getByTestId("activity-diff").click();
    await expect(page.getByTestId("research-diff-card")).toHaveCount(4);
    const list = page.getByTestId("research-diff-list");
    await expect(list).toContainText("Result value changed");
    await expect(list).toContainText("Method configuration changed");
    await expect(list).toContainText("Table results changed");
    await expect(list).toContainText("Figure source changed");
    await expect(list).toContainText("2.4e-4");
    await expect(list).toContainText("astra-evaluation-v2.svg");
  });

  test("inspects the stale figure and its generating artifact", async ({ page }) => {
    await selectText(page, "![GPT-6 Astra evaluation](demo/astra-evaluation-v1.svg)");
    await expect(page.getByTestId("selection-kind")).toHaveText("Figure");
    await expect(page.getByTestId("selection-status")).toHaveText("Stale");
    await expect(page.getByTestId("evidence-card")).toContainText("Astra evaluation figure");
    await expect(page.getByTestId("evidence-card")).toContainText("astra-run-254");
  });
});
