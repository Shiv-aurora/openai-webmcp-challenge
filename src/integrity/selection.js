const HEADING_PATTERN = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
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

  if (selection.empty && lineText.trim() === "---") return createEmptyManuscriptSelection();

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
  const candidateRange = selectedText ? { from: selection.from, to: selection.to, line: anchorLine.number, text: selectedText } : paragraph;

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
  const source = typeof markdown === "string" ? markdown : "";
  const sectionCount = (source.match(/^#{1,6}\s+.+$/gm) || []).length;
  const words = source.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g) || [];
  return { sectionCount, wordCount: words.length };
}
