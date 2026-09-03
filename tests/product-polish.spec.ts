import { expect, test } from "@playwright/test";

test("keeps the promise and three core workflows usable on a common laptop viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/?collab=false");
  await page.evaluate(() => localStorage.removeItem("myst/provenance/demo"));
  await page.reload();

  const panel = page.getByTestId("integrity-panel");
  await expect(panel).toBeVisible();
  await expect(panel.getByText("Every claim in your paper stays connected to the research that produced it.")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Research X-Ray" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Verify This" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Research Diff" })).toBeVisible();
  await expect(page.getByTestId("load-demo-research")).toBeVisible();

  await page.getByTestId("load-demo-research").click();
  await panel.getByRole("button", { name: "Research Diff" }).click();
  await expect(page.getByTestId("research-diff-card").first()).toBeInViewport();
  await expect(page.getByTestId("research-diff-card")).toHaveCount(4);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
