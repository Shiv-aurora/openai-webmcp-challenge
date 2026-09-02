from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file_path = Path(path)
    source = file_path.read_text()
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one {label} in {path}; found {count}")
    file_path.write_text(source.replace(old, new, 1))


def write_selection_model() -> None:
    Path("src/integrity").mkdir(parents=True, exist_ok=True)
    Path("src/integrity/selection.js").write_text(
        r'''const HEADING_PATTERN = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const FIGURE_PATTERN = /!\[[^\]]*\]\([^)]+\)|^\s*:::\{(?:figure|image)\}/im;
const TABLE_SEPARATOR_PATTERN = /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+(?:\s*:?-{3,}:?\s*)?$/;
const METHOD_SECTION_PATTERN = /\b(method|methods|methodology|approach|implementation|training|experimental setup)\b/i;
const CLAIM_PATTERN =
  /(?:\d+(?:\.\d+)?\s*%|\b(?:improv|outperform|increase|decrease|reduce|achiev|show|demonstrat|report|find|estimate|support|contain|use)\w*\b)/i;

const trackedKinds = new Set(["claim", "method", "figure", "table"]);

const cleanText = (text) =>
  text
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\s*[-*+]\s+/, "")
    .replace(/\s+/g, " ")
    .trim();

const isHeading = (text) => HEADING_PATTERN.test(text.trim());
const isFigure = (text) => FIGURE_PATTERN.test(text);
const looksLikeTableRow = (text) => text.includes("|") && text.split("|").length >= 3;

const isParagraphBoundary = (text) => {
  const trimmed = text.trim();
  return !trimmed || isHeading(trimmed) || isFigure(trimmed) || looksLikeTableRow(trimmed) || /^\s*(```|~~~|:::)/.test(trimmed);
};

function sectionForLine(doc, lineNumber) {
  for (let current = lineNumber; current >= 1; current -= 1) {
    const line = doc.line(current);
    const match = line.text.trim().match(HEADING_PATTERN);
    if (!match) continue;
    return {
      title: cleanText(match[2]),
      level: match[1].length,
      line: current,
      from: line.from,
      to: line.to,
    };
  }
  return null;
}

function paragraphAround(doc, lineNumber) {
  let start = lineNumber;
  let end = lineNumber;

  while (start > 1 && !isParagraphBoundary(doc.line(start - 1).text)) start -= 1;
  while (end < doc.lines && !isParagraphBoundary(doc.line(end + 1).text)) end += 1;

  const first = doc.line(start);
  const last = doc.line(end);
  return { from: first.from, to: last.to, line: start, text: doc.sliceString(first.from, last.to) };
}

function tableAround(doc, lineNumber) {
  if (!looksLikeTableRow(doc.line(lineNumber).text)) return null;

  let start = lineNumber;
  let end = lineNumber;
  while (start > 1 && looksLikeTableRow(doc.line(start - 1).text)) start -= 1;
  while (end < doc.lines && looksLikeTableRow(doc.line(end + 1).text)) end += 1;

  const rows = [];
  for (let current = start; current <= end; current += 1) rows.push(doc.line(current).text.trim());
  if (rows.length < 2 || !rows.some((row) => TABLE_SEPARATOR_PATTERN.test(row))) return null;

  const first = doc.line(start);
  const last = doc.line(end);
  return { from: first.from, to: last.to, line: start, text: doc.sliceString(first.from, last.to) };
}

function objectSelection(kind, range, section, selectedText, hasSelection) {
  const snippet = cleanText(selectedText || range.text).slice(0, 280);
  return {
    kind,
    from: range.from,
    to: range.to,
    line: range.line,
    section,
    snippet,
    hasSelection,
    verificationState: trackedKinds.has(kind) ? "unlinked" : "context-only",
  };
}

export function createEmptyManuscriptSelection() {
  return {
    kind: "none",
    from: 0,
    to: 0,
    line: 1,
    section: null,
    snippet: "",
    hasSelection: false,
    verificationState: "context-only",
  };
}

export function deriveManuscriptSelection(state) {
  if (!state?.doc || state.doc.length === 0) return createEmptyManuscriptSelection();

  const selection = state.selection.main;
  const anchorLine = state.doc.lineAt(selection.from);
  const section = sectionForLine(state.doc, anchorLine.number);
  const selectedText = selection.empty ? "" : state.sliceDoc(selection.from, selection.to);
  const lineText = anchorLine.text;

  const table = tableAround(state.doc, anchorLine.number);
  if (table) return objectSelection("table", table, section, selectedText, !selection.empty);

  if (isFigure(selectedText || lineText)) {
    return objectSelection(
      "figure",
      { from: anchorLine.from, to: anchorLine.to, line: anchorLine.number, text: lineText },
      section,
      selectedText,
      !selection.empty,
    );
  }

  const headingMatch = lineText.trim().match(HEADING_PATTERN);
  if (headingMatch) {
    return objectSelection(
      "section",
      { from: anchorLine.from, to: anchorLine.to, line: anchorLine.number, text: headingMatch[2] },
      section,
      selectedText,
      !selection.empty,
    );
  }

  const paragraph = paragraphAround(state.doc, anchorLine.number);
  const candidateText = selectedText || paragraph.text || lineText;
  const candidateRange = selectedText
    ? { from: selection.from, to: selection.to, line: anchorLine.number, text: selectedText }
    : paragraph;

  if (section && METHOD_SECTION_PATTERN.test(section.title) && cleanText(candidateText)) {
    return objectSelection("method", candidateRange, section, selectedText, !selection.empty);
  }

  if (CLAIM_PATTERN.test(candidateText)) {
    return objectSelection("claim", candidateRange, section, selectedText, !selection.empty);
  }

  if (cleanText(candidateText)) {
    return objectSelection("text", candidateRange, section, selectedText, !selection.empty);
  }

  return createEmptyManuscriptSelection();
}

export function manuscriptStats(markdown) {
  const sectionCount = (markdown.match(/^#{1,6}\s+.+$/gm) || []).length;
  const words = markdown.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g) || [];
  return { sectionCount, wordCount: words.length };
}
'''
    )


def write_integrity_panel() -> None:
    Path("src/integrity/ResearchIntegrityPanel.jsx").write_text(
        r'''import { useContext } from "preact/hooks";
import styled from "styled-components";
import { MystState } from "../mystState";
import { manuscriptStats } from "./selection";

const Panel = styled.aside`
  flex: 0 0 318px;
  width: 318px;
  min-width: 0;
  margin-left: 16px;
  border: 1px solid var(--border);
  border-radius: calc(var(--border-radius) + 2px);
  background: var(--panel-bg);
  box-shadow: 0 10px 30px color-mix(in srgb, var(--box-shadow) 45%, transparent);
  overflow: auto;
  scrollbar-width: thin;
  z-index: 8;

  @media (max-width: 1180px) {
    position: absolute;
    top: 20px;
    right: 20px;
    bottom: 20px;
    margin-left: 0;
    max-width: calc(100% - 40px);
  }

  @media (max-width: 680px) {
    left: 20px;
    width: auto;
  }

  @media print {
    display: none;
  }
`;

const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--border);
`;

const Kicker = styled.div`
  margin-bottom: 5px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.62;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 18px;
  line-height: 1.25;
  font-weight: 700;
`;

const CloseButton = styled.button`
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background: var(--button-bg);
  color: inherit;
  cursor: pointer;
  font-size: 19px;
  line-height: 1;

  &:hover {
    background: var(--button-bg-hover);
  }
`;

const Section = styled.section`
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);

  &:last-child {
    border-bottom: 0;
  }
`;

const SectionHeading = styled.div`
  margin-bottom: 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.62;
`;

const CoverageRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
`;

const CoverageValue = styled.strong`
  font-size: 23px;
  line-height: 1;
`;

const Muted = styled.p`
  margin: 9px 0 0;
  font-size: 12px;
  line-height: 1.5;
  opacity: 0.68;
`;

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 16px;
`;

const Metric = styled.div`
  padding: 11px 12px;
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background: color-mix(in srgb, var(--editor-bg) 70%, transparent);
`;

const MetricValue = styled.div`
  font-size: 17px;
  font-weight: 700;
`;

const MetricLabel = styled.div`
  margin-top: 3px;
  font-size: 11px;
  opacity: 0.62;
`;

const SelectionHeading = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
`;

const SelectionKind = styled.strong`
  font-size: 15px;
  text-transform: capitalize;
`;

const Status = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 9px;
  border: 1px solid ${(props) => (props.$status === "unlinked" ? "var(--orange-500)" : "var(--border)")};
  border-radius: 999px;
  background: ${(props) =>
    props.$status === "unlinked" ? "color-mix(in srgb, var(--orange-500) 12%, transparent)" : "var(--editor-bg)"};
  color: ${(props) => (props.$status === "unlinked" ? "var(--orange-500)" : "inherit")};
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
`;

const Snippet = styled.blockquote`
  margin: 0;
  padding: 12px 13px;
  border-left: 3px solid var(--accent-dark);
  border-radius: 0 var(--border-radius) var(--border-radius) 0;
  background: var(--editor-bg);
  font-size: 12px;
  line-height: 1.55;
  overflow-wrap: anywhere;
`;

const Meta = styled.dl`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 7px 12px;
  margin: 14px 0 0;
  font-size: 11px;

  dt {
    opacity: 0.58;
  }

  dd {
    min-width: 0;
    margin: 0;
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const EmptyState = styled.div`
  padding: 13px;
  border: 1px dashed var(--border);
  border-radius: var(--border-radius);
  background: color-mix(in srgb, var(--editor-bg) 55%, transparent);
  font-size: 12px;
  line-height: 1.55;
`;

const kindLabels = {
  none: "No selection",
  text: "Text",
  claim: "Claim",
  method: "Method",
  figure: "Figure",
  table: "Table",
  section: "Section",
};

const statusLabels = {
  unlinked: "Unlinked",
  "context-only": "Context only",
};

export default function ResearchIntegrityPanel() {
  const { integrityPanelOpen, manuscriptSelection, text } = useContext(MystState);
  const selection = manuscriptSelection.value;
  const stats = manuscriptStats(text.text.value);
  const selectionKind = kindLabels[selection.kind] || "Text";
  const selectionStatus = statusLabels[selection.verificationState] || "Context only";

  return (
    <Panel aria-label="Research integrity" data-testid="integrity-panel">
      <Header>
        <div>
          <Kicker>Manuscript state</Kicker>
          <Title>Research integrity</Title>
        </div>
        <CloseButton aria-label="Close research integrity panel" type="button" onClick={() => (integrityPanelOpen.value = false)}>
          ×
        </CloseButton>
      </Header>

      <Section>
        <SectionHeading>Provenance coverage</SectionHeading>
        <CoverageRow>
          <CoverageValue>0 linked</CoverageValue>
          <Status $status="context-only">Not started</Status>
        </CoverageRow>
        <Muted>Integrity tracking begins when manuscript objects are connected to research evidence.</Muted>
        <MetricGrid>
          <Metric>
            <MetricValue data-testid="manuscript-section-count">{stats.sectionCount}</MetricValue>
            <MetricLabel>Sections</MetricLabel>
          </Metric>
          <Metric>
            <MetricValue data-testid="manuscript-word-count">{stats.wordCount}</MetricValue>
            <MetricLabel>Words</MetricLabel>
          </Metric>
        </MetricGrid>
      </Section>

      <Section>
        <SectionHeading>Current selection</SectionHeading>
        <SelectionHeading>
          <SelectionKind data-testid="selection-kind">{selectionKind}</SelectionKind>
          <Status data-testid="selection-status" $status={selection.verificationState}>
            {selectionStatus}
          </Status>
        </SelectionHeading>
        {selection.snippet ? (
          <>
            <Snippet data-testid="selection-snippet">{selection.snippet}</Snippet>
            <Meta>
              <dt>Section</dt>
              <dd>{selection.section?.title || "Front matter"}</dd>
              <dt>Line</dt>
              <dd>{selection.line}</dd>
              <dt>Range</dt>
              <dd>{selection.hasSelection ? "Explicit selection" : "Cursor context"}</dd>
            </Meta>
          </>
        ) : (
          <EmptyState data-testid="selection-snippet">
            Select a claim, method statement, table, figure, or section to inspect its manuscript context.
          </EmptyState>
        )}
      </Section>

      <Section>
        <SectionHeading>Evidence relationship</SectionHeading>
        <EmptyState>
          {selection.verificationState === "unlinked"
            ? `This ${selectionKind.toLowerCase()} is not linked to research evidence yet.`
            : "No provenance object is attached to the current context. Phase 2 will add explicit evidence links and review states."}
        </EmptyState>
      </Section>
    </Panel>
  );
}
'''
    )


def patch_state() -> None:
    replace_once(
        "src/mystState.js",
        'import { syntaxTree } from "@codemirror/language";\n',
        'import { syntaxTree } from "@codemirror/language";\nimport { createEmptyManuscriptSelection } from "./integrity/selection";\n',
        "selection model import",
    )
    replace_once(
        "src/mystState.js",
        '  suggestMode: { id: "suggest-mode", tooltip: "Toggle suggest mode", active: (state) => state.suggestMode.value },\n};',
        '  suggestMode: { id: "suggest-mode", tooltip: "Toggle suggest mode", active: (state) => state.suggestMode.value },\n  integrityPanel: {\n    id: "integrity-panel",\n    tooltip: "Toggle research integrity panel",\n    active: (state) => state.integrityPanelOpen.value,\n  },\n};',
        "integrity toolbar button",
    )
    replace_once(
        "src/mystState.js",
        'export const defaultButtons = [\n  predefinedButtons.fullscreen,',
        'export const defaultButtons = [\n  predefinedButtons.integrityPanel,\n  predefinedButtons.fullscreen,',
        "default integrity toolbar button",
    )
    replace_once(
        "src/mystState.js",
        '  topbar: true,\n  templatelist: "",',
        '  topbar: true,\n  integrityPanel: true,\n  templatelist: "",',
        "integrity panel option",
    )
    replace_once(
        "src/mystState.js",
        '    suggestMode: signal(false),\n  };',
        '    suggestMode: signal(false),\n    integrityPanelOpen: signal(fullOptions.integrityPanel),\n    manuscriptSelection: signal(createEmptyManuscriptSelection()),\n  };',
        "integrity state signals",
    )


def patch_code_mirror() -> None:
    replace_once(
        "src/components/CodeMirror.jsx",
        'import { Logger } from "../logger";\n',
        'import { Logger } from "../logger";\nimport { deriveManuscriptSelection } from "../integrity/selection";\n',
        "selection derivation import",
    )
    replace_once(
        "src/components/CodeMirror.jsx",
        '  const { editorView, options, collab, userSettings, linter, text, headings, error, suggestMode } = useContext(MystState);',
        '  const { editorView, options, collab, userSettings, linter, text, headings, error, suggestMode, manuscriptSelection } =\n    useContext(MystState);',
        "selection state context",
    )
    replace_once(
        "src/components/CodeMirror.jsx",
        '''        .addUpdateListener((update) => {
          if (!update.docChanged) return;
          clearTimeout(renderTimer.current);
          renderTimer.current = setTimeout(() => {
            text.shiftLineMap(update);
            text.text.value = view.state.doc.toString();
          });
        })''',
        '''        .addUpdateListener((update) => {
          if (update.selectionSet || update.docChanged) {
            manuscriptSelection.value = deriveManuscriptSelection(update.state);
          }
          if (!update.docChanged) return;
          clearTimeout(renderTimer.current);
          renderTimer.current = setTimeout(() => {
            text.shiftLineMap(update);
            text.text.value = view.state.doc.toString();
          });
        })''',
        "selection-aware update listener",
    )
    replace_once(
        "src/components/CodeMirror.jsx",
        '    window.myst_editor[options.id.value].main_editor = view;\n\n    if (options.unfoldedHeadings.value != undefined) {',
        '    window.myst_editor[options.id.value].main_editor = view;\n    manuscriptSelection.value = deriveManuscriptSelection(view.state);\n\n    if (options.unfoldedHeadings.value != undefined) {',
        "initial manuscript selection",
    )


def patch_editor_shell() -> None:
    replace_once(
        "src/MystEditor.jsx",
        'import { createLogger, Logger } from "./logger";\n',
        'import { createLogger, Logger } from "./logger";\nimport ResearchIntegrityPanel from "./integrity/ResearchIntegrityPanel";\n',
        "integrity panel import",
    )
    replace_once(
        "src/MystEditor.jsx",
        '  const { editorView, cache, options, collab, text, suggestMode } = useContext(MystState);',
        '  const { editorView, cache, options, collab, text, suggestMode, integrityPanelOpen } = useContext(MystState);',
        "integrity panel state context",
    )
    replace_once(
        "src/MystEditor.jsx",
        '      "suggest-mode": () => (suggestMode.value = !suggestMode.peek()),\n',
        '      "suggest-mode": () => (suggestMode.value = !suggestMode.peek()),\n      "integrity-panel": () => (integrityPanelOpen.value = !integrityPanelOpen.peek()),\n',
        "integrity panel action",
    )
    replace_once(
        "src/MystEditor.jsx",
        '''              {options.mode.value === "Outline" && (
                <FlexWrapper className="flex-wrapper">
                  <TableOfContents />
                </FlexWrapper>
              )}
            </MystWrapper>''',
        '''              {options.mode.value === "Outline" && (
                <FlexWrapper className="flex-wrapper">
                  <TableOfContents />
                </FlexWrapper>
              )}
              {options.integrityPanel.value && integrityPanelOpen.value && <ResearchIntegrityPanel />}
            </MystWrapper>''',
        "integrity panel rendering",
    )


def patch_topbar() -> None:
    replace_once(
        "src/components/Topbar.jsx",
        'const icons = {\n',
        '''const IntegrityIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3L20 6.5V12.2C20 16.8 16.9 20.6 12 22C7.1 20.6 4 16.8 4 12.2V6.5L12 3Z" stroke="currentColor" stroke-width="1.7" />
    <path d="M8 12L10.6 14.6L16.4 8.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

const icons = {
''',
        "integrity icon",
    )
    replace_once(
        "src/components/Topbar.jsx",
        'const icons = {\n  fullscreen: FullscreenIcon,',
        'const icons = {\n  "integrity-panel": IntegrityIcon,\n  fullscreen: FullscreenIcon,',
        "integrity icon map",
    )
    replace_once(
        "src/components/Topbar.jsx",
        '  const { options, editorView, collab, suggestMode } = useContext(MystState);',
        '  const { options, editorView, collab, suggestMode, integrityPanelOpen } = useContext(MystState);',
        "integrity panel topbar state",
    )
    replace_once(
        "src/components/Topbar.jsx",
        '                active={button.active?.({ suggestMode })}',
        '                active={button.active?.({ suggestMode, integrityPanelOpen })}',
        "integrity button active state",
    )


def patch_demo_entrypoint() -> None:
    replace_once(
        "src/index.html",
        '          title: "Research Integrity Editor",\n',
        '          title: "Research Integrity Editor",\n          subtitle: "Regime-Aware Volatility Forecasting · provenance workspace",\n          integrityPanel: true,\n',
        "product workspace subtitle",
    )


def write_browser_tests() -> None:
    Path("tests/research-integrity.spec.ts").write_text(
        r'''import { expect, Page, test } from "@playwright/test";

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
    await expect(page.getByTestId("manuscript-section-count")).toHaveText("7");
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
    await expect(page.getByText("3. Method", { exact: true })).toBeVisible();
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
'''
    )


def main() -> None:
    write_selection_model()
    write_integrity_panel()
    patch_state()
    patch_code_mirror()
    patch_editor_shell()
    patch_topbar()
    patch_demo_entrypoint()
    write_browser_tests()


if __name__ == "__main__":
    main()
