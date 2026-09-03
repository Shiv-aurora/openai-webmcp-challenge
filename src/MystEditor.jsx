import { render } from "preact";
import { useEffect, useRef, useMemo, useContext, useState } from "preact/hooks";
import { StyleSheetManager, styled } from "styled-components";
import CodeMirror from "./components/CodeMirror";
import Preview, { PreviewFocusHighlight } from "./components/Preview";
import Diff from "./components/Diff";
import { EditorTopbar } from "./components/Topbar";
import ResolvedComments from "./components/Resolved";
import { handlePreviewClickToScroll } from "./extensions/syncDualPane";
import { createMystState, MystState, predefinedButtons, defaultButtons } from "./mystState";
import { batch, computed, signal, effect, useSignal, useSignalEffect } from "@preact/signals";
import { MystContainer } from "./styles/MystStyles";
import { syncCheckboxes } from "./markdown/markdownCheckboxes";
import { TableOfContents } from "./components/TableOfContents";
import ErrorModal from "./components/ErrorModal";
import ErrorBoundary from "./components/ErrorBoundary";
import { createLogger, Logger } from "./logger";
import ResearchIntegrityPanel from "./integrity/ResearchIntegrityPanel";
import ResearchActivityBar from "./integrity/ResearchActivityBar";
import { registerResearchWebMCPTools } from "./webmcp/register";
import { ResearchWorkspace } from "./workspace/ResearchWorkspace";
import { getLineById } from "./markdown/markdownSourceMap";
import { deriveManuscriptSelection } from "./integrity/selection";

const EditorParent = styled.div`
  font-family: var(--font-sans);
  display: flex;
  flex-flow: row wrap;
  width: 100%;
  height: 100%;
  ${(props) => props.fullscreen && "position: fixed; left: 0; top: 0; z-index: 10;"}
  ${(props) => {
    switch (props.mode) {
      case "Preview":
        return "#editor-wrapper { display: none }";
      case "Source":
        return "#preview-wrapper { display: none }";
      case "Diff":
        return "#editor-wrapper { display: none }; #preview-wrapper { display: none }";
      case "Both":
        return "#resolved-wrapper { display: none }";
      case "Resolved":
        return "#preview-wrapper { display: none };";
      case "Outline":
        return "#preview-wrapper { display: none };";
      case "Inline":
        return "#preview-wrapper { display: none }";
      default:
        return ``;
    }
  }}
`;

/** Panes sit flush against each other. The 1px gap over a hairline-colored track draws the
 * divider between them, and because `display: none` panes leave flex layout entirely, the gaps
 * collapse on their own whenever a pane is hidden by the mode switch. */
const MystWrapper = styled.div`
  padding: 0;
  gap: 1px;
  display: flex;
  box-sizing: border-box;
  height: 100%;
  width: 100%;
  position: relative;
  background-color: var(--hairline);
  ${(props) => props.fullscreen && "box-sizing:border-box; height: 100%;"}
`;

const StatusBanner = styled.div`
  height: 32px;
  position: sticky;
  z-index: 10;
  width: 100%;
  top: 45px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  background-color: var(--accent-light);
  color: var(--accent-dark);
  font-size: 13px;
  border-bottom: 1px solid var(--hairline);
`;

/** CSS flexbox takes the content size of elements to determine the layout and ignores padding.
 * This wrapper is here to make sure the padding is added one element deeper and elements are equal width.
 * Ideally we would use CSS Grid but that has some performance issues with CodeMirror on Chromium. */
const FlexWrapper = styled.div`
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  background: var(--paper);

  & > * {
    min-height: 500px;
  }
`;

const PreviewVerifyButton = styled.button`
  position: fixed;
  z-index: 40;
  top: ${(props) => props.$top}px;
  left: ${(props) => props.$left}px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--paper);
  color: var(--ink);
  box-shadow: var(--shadow-menu);
  cursor: pointer;
  font: 500 12px/1 var(--font-sans);

  &:hover {
    background: var(--canvas);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

const lineElementForNode = (node, previewElement) => {
  const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
  const directLineElement = element?.closest?.("[data-line-id]");
  if (directLineElement && previewElement.contains(directLineElement)) return directLineElement;

  // Markdown emphasis and links can sit between the source-mapped text spans in a rendered block.
  // In that case the block's first source marker still identifies the correct manuscript paragraph.
  const block = element?.closest?.("p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, figcaption");
  const lineElement = block?.querySelector?.("[data-line-id]");
  return lineElement && previewElement.contains(lineElement) ? lineElement : null;
};

const sourceRangeForPreviewSelection = (selection, previewElement, lineMap, view) => {
  if (!selection || selection.isCollapsed || !selection.rangeCount || !view) return null;
  const browserRange = selection.getRangeAt(0);
  const startElement = lineElementForNode(browserRange.startContainer, previewElement);
  const endElement = lineElementForNode(browserRange.endContainer, previewElement);
  if (!startElement || !endElement) return null;

  const startLine = getLineById(lineMap, startElement.getAttribute("data-line-id"));
  const endLine = getLineById(lineMap, endElement.getAttribute("data-line-id"));
  if (!startLine || !endLine) return null;

  const doc = view.state.doc;
  let firstLine = Math.min(startLine, endLine);
  let lastLine = Math.max(startLine, endLine);
  while (firstLine > 1 && doc.line(firstLine - 1).text.trim()) firstLine -= 1;
  while (lastLine < doc.lines && doc.line(lastLine + 1).text.trim()) lastLine += 1;

  const windowFrom = doc.line(firstLine).from;
  const windowTo = doc.line(lastLine).to;
  const selectedText = selection.toString().replaceAll("\u00a0", " ").trim();
  if (!selectedText) return null;

  const source = doc.sliceString(windowFrom, windowTo);
  const exactIndex = source.indexOf(selectedText);
  if (exactIndex >= 0) return { from: windowFrom + exactIndex, to: windowFrom + exactIndex + selectedText.length };

  const comparable = [];
  const sourceIndexes = [];
  let previousWasSpace = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (/[*_`~#{}]/.test(character)) continue;
    if (/\s/.test(character)) {
      if (previousWasSpace) continue;
      comparable.push(" ");
      sourceIndexes.push(index);
      previousWasSpace = true;
      continue;
    }
    comparable.push(character);
    sourceIndexes.push(index);
    previousWasSpace = false;
  }

  const normalizedSelection = selectedText.replace(/\s+/g, " ");
  const normalizedSource = comparable.join("");
  const normalizedIndex = normalizedSource.indexOf(normalizedSelection);
  if (normalizedIndex < 0) return null;
  const from = windowFrom + sourceIndexes[normalizedIndex];
  const lastIndex = normalizedIndex + normalizedSelection.length - 1;
  return { from, to: windowFrom + sourceIndexes[lastIndex] + 1 };
};

const hideBodyScrollIf = (val) => (document.documentElement.style.overflow = val ? "hidden" : "visible");

const MystEditor = () => {
  const editorState = useContext(MystState);
  const { editorView, cache, options, collab, text, suggestMode, integrityPanelOpen, manuscriptSelection, integrityExperience, workspaceView } =
    editorState;
  const fullscreen = useSignal(false);
  useSignalEffect(() => hideBodyScrollIf(fullscreen.value));

  const preview = useRef(null);
  const [previewVerify, setPreviewVerify] = useState(null);
  useEffect(() => {
    text.preview.value = preview.current;
  }, [preview.current]);

  const alert = useSignal(null);
  const alertFor = (alertText, secs) => {
    alert.value = alertText;
    setTimeout(() => (alert.value = null), secs * 1000);
  };

  const buttonActions = useMemo(
    () => ({
      "copy-html": async () => {
        await text.copy();
        alertFor("copied!", 2);
      },
      fullscreen: () => (fullscreen.value = !fullscreen.peek()),
      refresh: () => {
        cache.transform.clear();
        text.renderText(false);
        alertFor("Rich links refreshed!", 1);
      },
      "suggest-mode": () => (suggestMode.value = !suggestMode.peek()),
      "integrity-panel": () => (integrityPanelOpen.value = !integrityPanelOpen.peek()),
    }),
    [],
  );

  const buttons = useMemo(
    () =>
      options.includeButtons.value.map((b) => ({
        ...b,
        action: b.action || buttonActions[b.id],
      })),
    [options.includeButtons.value, buttonActions],
  );

  const syncPreviewSelection = () => {
    const previewElement = preview.current;
    const root = previewElement?.getRootNode?.();
    const browserSelection = root?.getSelection?.() || window.getSelection();
    const sourceRange = sourceRangeForPreviewSelection(browserSelection, previewElement, text.lineMap, editorView.value);
    if (!sourceRange) {
      setPreviewVerify(null);
      return;
    }

    editorView.value.dispatch({ selection: { anchor: sourceRange.from, head: sourceRange.to } });
    manuscriptSelection.value = deriveManuscriptSelection(editorView.value.state);
    const rect = browserSelection.getRangeAt(0).getBoundingClientRect();
    setPreviewVerify({
      top: Math.max(8, rect.top - 34),
      left: Math.min(window.innerWidth - 70, Math.max(8, rect.left + rect.width / 2 - 28)),
    });
  };

  return (
    <StyleSheetManager target={options.parent}>
      <MystContainer id="myst-css-namespace">
        <ErrorModal />
        <ErrorBoundary>
          <EditorParent mode={options.mode.value} fullscreen={fullscreen.value}>
            {options.topbar.value && <EditorTopbar alert={alert} buttons={buttons} />}
            {options.collaboration.value.enabled && !collab.value.ready.value && (
              <StatusBanner>Connecting to the collaboration server ...</StatusBanner>
            )}
            {options.collaboration.value.enabled && collab.value.lockMsg.value && <StatusBanner>{collab.value.lockMsg}</StatusBanner>}
            <ResearchWorkspace>
              <MystWrapper className="myst-editor-wrapper" fullscreen={fullscreen.value}>
                {options.integrityPanel.value && <ResearchActivityBar />}
                {options.integrityPanel.value && integrityPanelOpen.value && <ResearchIntegrityPanel />}
                <FlexWrapper id="editor-wrapper" className="flex-wrapper">
                  <CodeMirror />
                </FlexWrapper>
                <FlexWrapper id="preview-wrapper" className="flex-wrapper">
                  <Preview
                    className="myst-preview"
                    ref={preview}
                    mode={options.mode.value}
                    onMouseUp={syncPreviewSelection}
                    onKeyUp={syncPreviewSelection}
                    onScroll={() => setPreviewVerify(null)}
                    onClick={(ev) => {
                      try {
                        if (options.onPreviewClick.value?.(ev)) return;
                        if (text.toggleFoldOnClick(ev)) return;

                        syncCheckboxes(ev, text.lineMap, editorView.value);

                        if (options.syncScroll.value && options.mode.value == "Both") {
                          handlePreviewClickToScroll(ev, text.lineMap, preview, editorView.value);
                        }
                      } catch (e) {
                        console.error("The following error occured while handling a click on the preview pane");
                        console.error(e);
                      }
                    }}
                  >
                    <PreviewFocusHighlight className="cm-previewFocus" />
                  </Preview>
                </FlexWrapper>
                {options.mode.value === "Diff" && (
                  <FlexWrapper className="flex-wrapper">
                    <Diff />
                  </FlexWrapper>
                )}
                {options.mode.value == "Resolved" &&
                  options.collaboration.value.commentsEnabled &&
                  options.collaboration.value.resolvingCommentsEnabled &&
                  collab.value.ready.value && (
                    <FlexWrapper id="resolved-wrapper" className="flex-wrapper">
                      <ResolvedComments />
                    </FlexWrapper>
                  )}
                {options.mode.value === "Outline" && (
                  <FlexWrapper className="flex-wrapper">
                    <TableOfContents />
                  </FlexWrapper>
                )}
                {previewVerify && (
                  <PreviewVerifyButton
                    $left={previewVerify.left}
                    $top={previewVerify.top}
                    data-testid="preview-verify"
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      workspaceView.value = "paper";
                      integrityExperience.value = "verify";
                      integrityPanelOpen.value = true;
                      setPreviewVerify(null);
                    }}
                  >
                    Verify
                  </PreviewVerifyButton>
                )}
              </MystWrapper>
            </ResearchWorkspace>
          </EditorParent>
        </ErrorBoundary>
      </MystContainer>
    </StyleSheetManager>
  );
};

export default ({ additionalStyles, id, ...params }, /** @type {HTMLElement} */ target) => {
  if (!target.shadowRoot) {
    target.attachShadow({
      mode: "open",
    });
  }
  if (additionalStyles) {
    target.shadowRoot.adoptedStyleSheets = target.shadowRoot.adoptedStyleSheets.filter((s) => !additionalStyles.includes(s));
    target.shadowRoot.adoptedStyleSheets.push(...(Array.isArray(additionalStyles) ? additionalStyles : [additionalStyles]));
  }
  params.parent = target.shadowRoot;

  const editorId = id ?? crypto.randomUUID();
  if (!window.myst_editor) window.myst_editor = {};
  if (editorId in window.myst_editor) {
    throw `Editor with id ${editorId} is already on the page. Pick a different id, or leave it empty for a random one.`;
  }
  window.myst_editor[editorId] = {};

  const form = target.closest("form");
  if (form) {
    form.addEventListener("formdata", (e) => e.formData.append(params.name, window.myst_editor[editorId].text));
  }

  const state = createMystState({ id: editorId, ...params });
  window.myst_editor[editorId].state = state;
  state.cleanups.push(registerResearchWebMCPTools(state));
  const logger = createLogger(state);
  window.myst_editor[editorId].logger = logger;

  // cleanup function
  function remove() {
    state.cleanups.forEach((c) => c());
    delete window.myst_editor[editorId];
    render(null, target.shadowRoot);
  }
  window.myst_editor[editorId].remove = remove;
  // runs Preact cleanup logic when target is removed
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (Array.prototype.some.call(mutation.removedNodes, (n) => n == target)) {
        remove();
        observer.disconnect();
      }
    }
  });
  observer.observe(target.parentElement, { childList: true });

  render(
    <MystState.Provider value={state}>
      <Logger.Provider value={logger}>
        <MystEditor />
      </Logger.Provider>
    </MystState.Provider>,
    target.shadowRoot,
  );

  return state;
};

export { defaultButtons, predefinedButtons, batch, computed, signal, effect, MystEditor as MystEditorPreact };
export { default as MystEditorGit } from "./myst-git/MystEditorGit";
export { CollaborationClient } from "./collaboration";
export { darkTheme } from "./styles/MystStyles";
