import { useContext, useRef } from "preact/hooks";
import { EditorView } from "codemirror";
import { EditorState } from "@codemirror/state";
import styled, { css } from "styled-components";
import { ExtensionBuilder, skipAndFoldAll, foldMarkedHeadings } from "../extensions";
import { YCommentsParent } from "./Comment";
import commentIcon from "../icons/comment.svg?raw";
import { MystState } from "../mystState";
import { userExtensionsCompartment } from "./Settings";
import { useSignalEffect } from "@preact/signals";
import { FoldChevron, MdStyles } from "./Preview";
import { Logger } from "../logger";
import { deriveManuscriptSelection } from "../integrity/selection";
import { ensureProvenanceStore } from "../integrity/provenance";
import { refreshXray, xrayCompartment, xrayField } from "../integrity/xray";

const CodeEditor = styled.div`
  background: ${(props) => (props.$mode != "Inline" ? "var(--editor-bg)" : "var(--panel-bg)")};
  font-family: var(--font-mono);
  font-size: 13.5px;
  line-height: 1.65;
  resize: none;
  border: 0;
  /* The comment overlay positions itself against these exact insets (see YCommentWrapper), so the
     top and side padding have to stay at 20px. The tall bottom padding only extends the scroll
     range, letting the last line settle mid-viewport. */
  padding: 20px 20px 25vh;
  box-sizing: border-box;
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  position: relative;

  .cm-editor .cm-gutters {
    background-color: ${(props) => (props.$mode != "Inline" ? "var(--editor-bg)" : "var(--panel-bg)")};
    border-right: 0;
  }

  .comment-gutter-icon {
    height: 17px;
    width: 17px;
    cursor: pointer;
  }

  .comment-image {
    position: absolute;
    display: inline;
    background-image: url("data:image/svg+xml;charset=UTF-8,${() => encodeURIComponent(commentIcon)}");
    filter: invert(var(--icon-invert));
    background-repeat: no-repeat;
  }

  .comment-box {
    width: 95%;
    display: flex;
    margin: 0px;
    padding: 0px;
  }

  .comment-box-hidden {
    position: absolute;
    pointer-events: none;
    margin-top: -5px;
  }

  @media print {
    & {
      display: none;
    }
  }

  .cm-editor .cm-ySelectionInfo {
    font-size: 10px;
    padding: 4px 8px;
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
    border-bottom-right-radius: 10px;
    font-family: var(--font-sans);
    font-weight: 500;
    transition: none;

    &.active {
      opacity: 1;
    }
  }

  .cm-ySelectionCaretDot {
    transition: none;
    &:has(+ .active) {
      transform: scale(0);
    }
  }

  .cm-widgetBuffer {
    margin-bottom: 0;
  }

  .cm-yLineSelection {
    margin: 0 2px 0 0px;
  }

  .cm-editor {
    outline: 0;
  }

  .cm-scroller {
    overflow: visible;
  }

  .cm-error {
    text-decoration: underline var(--error-bg) 2px;
  }

  .cm-xray-object {
    border-radius: 3px;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
  }

  .cm-xray-verified {
    background: color-mix(in srgb, var(--accent-dark) 12%, transparent);
    text-decoration: underline solid var(--accent-dark) 2px;
    text-underline-offset: 3px;
  }

  .cm-xray-needs-review {
    background: color-mix(in srgb, var(--orange-500) 12%, transparent);
    text-decoration: underline dashed var(--orange-500) 2px;
    text-underline-offset: 3px;
  }

  .cm-xray-stale {
    background: color-mix(in srgb, var(--orange-500) 20%, transparent);
    text-decoration: underline double var(--orange-500) 2px;
    text-underline-offset: 3px;
  }

  .cm-xray-contradicted {
    background: color-mix(in srgb, var(--error-bg) 18%, transparent);
    text-decoration: underline wavy var(--error-bg) 2px;
    text-underline-offset: 3px;
  }

  .cm-xray-unlinked {
    background: color-mix(in srgb, var(--border) 30%, transparent);
    text-decoration: underline dotted var(--editor-gutter-fg) 2px;
    text-underline-offset: 3px;
  }

  .cm-link {
    color: var(--accent-dark);

    .cm-error {
      text-decoration: unset;
    }

    .ͼ6.ͼ5 {
      color: unset;
    }
  }

  .cm-mono {
    color: var(--accent-dark);
  }

  [title="Fold line"] {
    user-select: none;
  }

  .cm-panels-bottom {
    z-index: 3;
  }

  :not(.cm-focused) > .cm-scroller > .cm-selectionLayer .cm-selectionBackground {
    background: transparent;
  }

  .cm-editor.cm-focused {
    outline: none;
  }

  .cm-gutterElement {
    color: var(--editor-gutter-fg);
  }

  /* Rendered blocks are much taller than a line of text, which leaves the number stranded at the
     top of them. CodeMirror sizes every gutter element to its line block, so centering is enough. */
  ${(props) =>
    props.$mode === "Inline" &&
    css`
      .cm-lineNumbers .cm-gutterElement {
        display: flex;
        align-items: center;
        justify-content: flex-end;
      }
    `}

  .cm-foldGutter {
    margin-right: 5px;

    .cm-foldMarker {
      ${FoldChevron}
      width: 12px;
      height: 100%;
    }

    .cm-foldMarker[data-fold="closed"]::before {
      transform: rotate(-45deg) translate(-0.75px, -0.75px);
    }
  }

  .cm-line {
    padding-left: 11px;
  }

  .cm-activeLine:not(.comment-wrapper *) {
    position: relative;

    &::before {
      content: "";
      display: block;
      width: 2px;
      height: 100%;
      position: absolute;
      z-index: 200;
      border-radius: 1px;
      background-color: var(--accent);
      transform: translateX(-9px);
    }
  }

  .cm-tooltip-hover {
    padding: 10px;

    & *:first-child {
      margin-top: 0;
    }

    & *:last-child {
      margin-bottom: 0;
    }
  }

  .cm-inline-bullet::after {
    display: inline-block;
    content: "•";
  }

  .cm-inline-ordered-list-marker::after {
    display: inline-block;
    font-family: var(--font-sans);
    content: attr(data-item-num);
  }

  .cm-inline-rendered-md {
    &:not(&.inline-custom-styles) {
      all: initial;
      color: inherit;
      font-family: var(--font-sans);
      font-size: 16px;
      /* Takes back the mid-word breaking of the line, without which content too long to fit widens the editor instead of wrapping. */
      word-break: inherit;
    }

    ${MdStyles}

    aside.admonition {
      margin-bottom: 0;
    }

    & > * {
      margin: 0 !important;
    }
  }

  .cm-inline-mono,
  .cm-inline-mono *,
  .cm-line > *:has(> .cm-inline-mono) {
    font-family: var(--font-mono) !important;
    line-height: 1.5 !important;
    font-size: 13.5px !important;
    /* An inline-block would be sized against the whole line instead of the space left in the row, so it would move down as a whole and break the text early. */
    display: inline !important;
  }

  .cm-editor .cm-lintRange-error {
    background-image: none;
    text-decoration: underline var(--error-bg) 2px;
  }

  .cm-editor .cm-diagnostic-error {
    border-left: 5px solid var(--error-bg);
  }

  .cm-editor .cm-tooltip {
    max-width: min(90vw, 600px);

    a {
      color: var(--accent-dark);
    }
  }

  .cm-critic-widget {
    display: inline-flex;
    align-items: center;
    margin-left: 4px;
    transform: translateY(2px);

    button {
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      height: 16px;

      img {
        width: 16px;
        height: auto;
      }
    }
  }

  .cm-critic-meta {
    color: var(--ink-faint);
  }

  .cm-critic-ins {
    background: var(--inserted-bg);
    text-decoration: underline;
  }

  .cm-critic-del {
    background: var(--deleted-bg);
    text-decoration: line-through;
  }
`;

const CodeMirror = () => {
  const editorState = useContext(MystState);
  const { editorView, options, collab, userSettings, linter, text, headings, error, suggestMode, manuscriptSelection } = editorState;
  const provenance = ensureProvenanceStore(editorState);
  const logger = useContext(Logger);
  const editorMountpoint = useRef(null);
  const focusScroll = useRef(null);
  const lastTyped = useRef(null);
  const renderTimer = useRef(null);

  useSignalEffect(() => {
    const view = editorView.value;
    const active = provenance.xrayActive.value;
    const objects = provenance.data.value.objects;
    if (!view?.dispatch) return;
    refreshXray(view, active, objects);
  });

  useSignalEffect(() => {
    if (!options.collaboration.value.enabled || (collab.value.ready.value && !collab.value.lockMsg.value && !error.value)) return;
    editorView.value?.destroy();

    const view = new EditorView({
      root: options.parent,
      state: EditorState.create({
        doc: text.text.peek(),
        extensions: ExtensionBuilder.basicSetup().useLanguage(options.language.value, options.transforms.value).useReadonly().create(),
      }),
      parent: editorMountpoint.current,
    });
    view.dom.style.opacity = "0.5";

    collab.value?.ycomments?.registerCodeMirror(view);

    return () => {
      view.destroy();
    };
  });

  useSignalEffect(() => {
    const userExtensions = userSettings.value.filter((s) => s.enabled && s.extension).map((s) => s.extension);
    editorView.value?.dispatch?.({
      effects: userExtensionsCompartment.reconfigure(userExtensions),
    });
  });

  useSignalEffect(() => {
    if (options.collaboration.value.enabled) {
      if (!collab.value.ready.value || collab.value.lockMsg.value || error.value) return;

      if (collab.value.ytext.toString().length === 0 && options.initialText.peek().length > 0) {
        console.warn("[Collaboration] Remote state is empty, overriding with local state");
        text.text.value = options.initialText.peek();
        collab.value.ydoc.transact(() => {
          collab.value.ytext.insert(0, options.initialText.peek());
          const metaMap = collab.value.ydoc.getMap("meta");
          metaMap.set("initial", true);
        });
      }

      text.text.value = collab.value.ytext.toString();
      collab.value.ytext.observe((ev, tr) => {
        if (!tr.local) return;
        lastTyped.current = performance.now();
      });
    }

    const startState = EditorState.create({
      root: options.parent,
      doc: options.collaboration.value.enabled ? collab.value.ytext.toString() : text.text.peek(),
      extensions: ExtensionBuilder.basicSetup()
        .useLanguage(options.language.value, options.transforms.value)
        .useLineNumbers()
        .useCompartment(userExtensionsCompartment, [])
        .useCompartment(xrayCompartment, xrayField)
        .useSpellcheck(options.spellcheckOpts.value)
        .if(options.collaboration.value.enabled, (b) => {
          return b.useCollaboration({ collabClient: collab.value, editorView });
        })
        .if(!options.collaboration.value.enabled, (b) => b.useDefaultHistory())
        .if(options.collaboration.value.commentsEnabled, (b) => b.useComments({ ycomments: collab.value.ycomments }))
        .addUpdateListener((update) => {
          if (update.selectionSet || update.docChanged) {
            manuscriptSelection.value = deriveManuscriptSelection(update.state);
          }
          if (!update.docChanged) return;
          clearTimeout(renderTimer.current);
          renderTimer.current = setTimeout(() => {
            text.shiftLineMap(update);
            text.text.value = view.state.doc.toString();
          });
        })
        .useFixFoldingScroll(focusScroll)
        .useMoveCursorAfterFold()
        .if(options.mode.value === "Both", (b) => b.useCursorIndicator({ text }))
        .if(options.syncScroll.value && options.mode.value === "Both", (b) => b.useSyncPreviewWithCursor({ text, lastTyped }))
        .if(options.yamlSchema.value, (b) => b.useYamlSchema(options.yamlSchema.value, editorView, linter))
        .if(options.mode.value === "Inline", (b) => b.useInlinePreview(text, options, editorView))
        .useTrackHeadings(headings)
        .useExceptionSink(error)
        .useLogger(logger)
        .if(options.cmDarkTheme.value, (b) => b.useCmDarkTheme())
        .useCriticMarkup()
        .if(suggestMode.value, (b) => b.useSuggestMode())
        .create(),
    });

    const view = new EditorView({
      state: startState,
      parent: editorMountpoint.current,
    });
    editorView.value = view;
    window.myst_editor[options.id.value].main_editor = view;
    manuscriptSelection.value = deriveManuscriptSelection(view.state);

    if (options.unfoldedHeadings.value != undefined) {
      skipAndFoldAll(view, options.unfoldedHeadings.value);
    }
    if (options.collapsibleHeadingMarker.value) {
      foldMarkedHeadings(view);
    }

    collab.value?.ycomments?.registerCodeMirror(view);

    /* We call updateMainCodeMirror to recreate spacing for comments. Calling this function immediately inside useSignalEffect
     * would cause an infinite loop (probably because the effect that it triggers interacts with some dependencies of this hook)
     * so instead we call it outside the current hook using setTimeout. */
    setTimeout(() => {
      collab.value?.ycomments?.updateMainCodeMirror();
    }, 0);

    return () => {
      view.destroy();
    };
  });

  return (
    <CodeEditor className="myst-main-editor" ref={editorMountpoint} $mode={options.mode.value} id={`${options.id.value}-editor`}>
      {options.collaboration.value.commentsEnabled && collab.value.ready.value && collab.value.ycomments?.mainCodeMirror && <YCommentsParent />}
    </CodeEditor>
  );
};

export default CodeMirror;
export { CodeEditor };
