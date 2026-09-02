import { expect, Page, test } from "@playwright/test";

const loadWorkspace = async (page: Page) => {
  await page.goto("/?collab=false");
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

test.describe("Research integrity workspace", () => {
  test.beforeEach(async ({ page }) => loadWorkspace(page));

  test("shows an honest manuscript-level integrity summary", async ({ page }) => {
    await expect(page.getByText("Research integrity", { exact: true })).toBeVisible();
    await expect(page.getByText("0 linked", { exact: true })).toBeVisible();
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
});
