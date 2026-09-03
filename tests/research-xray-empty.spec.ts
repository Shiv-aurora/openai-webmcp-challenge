import { expect, test } from "@playwright/test";

test("Research X-Ray explains an empty integrity map without inventing provenance", async ({ page }) => {
  await page.goto("/?collab=false&empty=true");
  await page.waitForSelector(".cm-content");

  await page.getByTestId("toggle-xray").click();

  await expect(page.getByRole("heading", { name: "Research X-Ray", exact: true })).toBeVisible();
  await expect(page.getByTestId("xray-summary")).toBeVisible();
  for (const state of ["verified", "needs-review", "stale", "contradicted", "unlinked"]) {
    await expect(page.getByTestId(`xray-count-${state}`)).toHaveText("0");
  }
  await expect(page.getByTestId("xray-item")).toHaveCount(0);
  await expect(page.getByText("No tracked manuscript objects yet. Track a claim, method, figure, or table to populate X-Ray.")).toBeVisible();
  await expect(page.locator(".cm-xray-object")).toHaveCount(0);
});
