from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file_path = Path(path)
    source = file_path.read_text()
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one {label} in {path}; found {count}")
    file_path.write_text(source.replace(old, new, 1))


replace_once(
    "src/integrity/selection.js",
    '''export function manuscriptStats(markdown) {
  const sectionCount = (markdown.match(/^#{1,6}\\s+.+$/gm) || []).length;
  const words = markdown.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g) || [];
  return { sectionCount, wordCount: words.length };
}''',
    '''export function manuscriptStats(markdown) {
  const source = typeof markdown === "string" ? markdown : "";
  const sectionCount = (source.match(/^#{1,6}\\s+.+$/gm) || []).length;
  const words = source.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g) || [];
  return { sectionCount, wordCount: words.length };
}''',
    "safe manuscript statistics",
)

replace_once(
    "tests/research-integrity.spec.ts",
    'await expect(page.getByTestId("manuscript-section-count")).toHaveText("7");',
    'await expect(page.getByTestId("manuscript-section-count")).toHaveText("8");',
    "section count assertion",
)

replace_once(
    "tests/research-integrity.spec.ts",
    'await expect(page.getByText("3. Method", { exact: true })).toBeVisible();',
    'await expect(page.getByTestId("integrity-panel").getByText("3. Method", { exact: true })).toBeVisible();',
    "scoped method section assertion",
)
