import { expect, test } from "@playwright/test";

test("keeps the promise and three core workflows usable on a common laptop viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/?collab=false&empty=true");
  await page.evaluate(() => localStorage.removeItem("myst/provenance/demo"));
  await page.reload();

  const panel = page.getByTestId("integrity-panel");
  const activityBar = page.getByTestId("research-activity-bar");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { name: "X-Ray", exact: true })).toBeVisible();
  await expect(panel.getByText("Every claim in your paper stays connected to the research that produced it.")).toHaveCount(0);
  await expect(activityBar.getByRole("button", { name: "Research X-Ray" })).toBeVisible();
  await expect(activityBar.getByRole("button", { name: "Source provenance" })).toBeVisible();
  await expect(activityBar.getByRole("button", { name: "Experiment tracking" })).toHaveCount(0);
  await expect(activityBar.getByRole("button", { name: "Research Diff" })).toBeVisible();
  await expect(activityBar.getByRole("button", { name: "Verify claim" })).toBeVisible();
  await expect(page.getByText("Demo", { exact: true })).toBeVisible();
  await expect(page.getByTestId("nav-paper")).toHaveText("Paper");
  await expect(page.getByRole("button", { name: "Agent", exact: true })).toHaveCount(0);
  await expect(page.getByTestId("load-demo-research")).toBeVisible();

  const [railBox, panelBox] = await Promise.all([activityBar.boundingBox(), panel.boundingBox()]);
  expect(railBox!.x).toBeLessThan(panelBox!.x);

  await page.getByTestId("load-demo-research").click();
  await activityBar.getByRole("button", { name: "Research Diff" }).click();
  await expect(page.getByTestId("research-diff-card").first()).toBeInViewport();
  await expect(page.getByTestId("research-diff-card")).toHaveCount(4);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("keeps the document title editable and writes it back to manuscript metadata", async ({ page }) => {
  await page.goto("/?collab=false&empty=true");

  const title = page.getByLabel("Document title");
  await title.fill("Stress-Regime Forecasting Study");
  await title.press("Enter");

  await expect(title).toHaveValue("Stress-Regime Forecasting Study");
  await expect.poll(() => page.evaluate(() => window.myst_editor.demo.text)).toMatch(/^---\ntitle: "Stress-Regime Forecasting Study"/);
});

test("keeps every top-right view control functional from the research workspace", async ({ page }) => {
  await page.goto("/?collab=false");
  await expect(page.locator(".avatar")).toHaveCount(0);

  await page.getByRole("button", { name: /^Experiments/ }).click();
  await page.getByRole("button", { name: "Source", exact: true }).click();
  await expect(page.locator("#editor-wrapper")).toBeVisible();
  await expect(page.locator("#preview-wrapper")).toBeHidden();

  await page.getByRole("button", { name: /^Experiments/ }).click();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.locator("#editor-wrapper")).toBeHidden();
  await expect(page.locator("#preview-wrapper")).toBeVisible();

  await page.getByRole("button", { name: /^Experiments/ }).click();
  await page.getByRole("button", { name: "Dual Pane", exact: true }).click();
  await expect(page.locator("#editor-wrapper")).toBeVisible();
  await expect(page.locator("#preview-wrapper")).toBeVisible();

  await page.getByLabel("More options").click();
  await expect(page.getByText("Document", { exact: true })).toBeVisible();
  await expect(page.getByText("More views", { exact: true })).toBeVisible();
});

test("maps rendered-paper selections to the manuscript and offers Verify beside them", async ({ page }) => {
  await page.goto("/?collab=false");
  await page.getByRole("button", { name: "Dual Pane", exact: true }).click();

  const selectionRect = await page.evaluate(() => {
    const root = document.querySelector("#myst")!.shadowRoot!;
    const strong = [...root.querySelectorAll(".myst-preview strong")].find((node) => node.textContent?.includes("76.9% on the Astra Reasoning Index"))!;
    const paragraph = strong.closest("p")!;
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
    const startNode = textNodes.find((node) => node.data.includes("manuscript"))!;
    const endNode = textNodes.find((node) => node.data.includes("locked evaluation"))!;
    const range = document.createRange();
    range.setStart(startNode, startNode.data.indexOf("manuscript"));
    range.setEnd(endNode, endNode.data.indexOf("locked") + "locked".length);
    const selection = root.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    strong.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    const rect = range.getBoundingClientRect();
    return { top: rect.top, text: selection.toString() };
  });

  expect(selectionRect.text).toContain("76.9% on the Astra Reasoning Index");
  const verify = page.getByTestId("preview-verify");
  await expect(verify).toBeVisible();
  await expect(verify).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(verify).toHaveCSS("color", "rgb(55, 53, 47)");
  const verifyRect = await verify.boundingBox();
  expect(verifyRect!.y).toBeLessThan(selectionRect.top);

  await verify.click();
  await expect(page.getByRole("heading", { name: "Verify", exact: true })).toBeVisible();
  await expect(page.getByTestId("selection-kind")).toHaveText("Claim");
  await expect(page.getByTestId("selection-snippet")).toContainText("76.9% on the Astra Reasoning Index");
  await expect(page.getByTestId("selection-status")).toHaveText("Contradicted");
  await expect(page.getByTestId("evidence-card")).toHaveCount(2);
  await page.getByTestId("verify-this").click();
  await expect(page.getByTestId("verification-result")).toContainText("78.4%");
});
