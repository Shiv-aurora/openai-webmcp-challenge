from pathlib import Path

path = Path("tests/research-integrity.spec.ts")
text = path.read_text()

old = '''    await expect(page.getByTestId("xray-count-verified")).toHaveText("1");
    await expect(page.locator(".cm-xray-verified")).toHaveCount(1);
    await expect(page.locator('[data-xray-state="verified"]')).toContainText("18.2% improvement");
'''
new = '''    await expect(page.getByTestId("xray-count-verified")).toHaveText("1");
    await expect.poll(async () => page.locator(".cm-xray-verified").count()).toBeGreaterThan(0);
    const verifiedObjectIds = await page
      .locator('[data-xray-state="verified"]')
      .evaluateAll((nodes) => [...new Set(nodes.map((node) => node.getAttribute("data-xray-object-id")))].filter(Boolean));
    expect(verifiedObjectIds).toHaveLength(1);
    await expect
      .poll(async () => (await page.locator('[data-xray-state="verified"]').allTextContents()).join(""))
      .toContain("18.2% improvement");
'''
if old not in text:
    raise RuntimeError("First X-Ray assertion block not found")
text = text.replace(old, new, 1)

old = '''    for (const state of ["verified", "needs-review", "stale", "contradicted", "unlinked"]) {
      await expect(page.getByTestId(`xray-count-${state}`)).toHaveText("1");
      await expect(page.locator(`.cm-xray-${state}`)).toHaveCount(1);
    }
    await expect(page.getByTestId("xray-item")).toHaveCount(5);
'''
new = '''    const stateLabels = {
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
'''
if old not in text:
    raise RuntimeError("Five-state X-Ray assertion block not found")
text = text.replace(old, new, 1)
path.write_text(text)

Path("scripts/fix_phase3_tests.py").unlink(missing_ok=True)
Path(".github/workflows/fix-phase3-tests.yml").unlink(missing_ok=True)
