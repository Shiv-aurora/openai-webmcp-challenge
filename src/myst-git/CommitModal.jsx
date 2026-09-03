import { useComputed, useSignal, useSignalEffect } from "@preact/signals";
import { EditorView } from "codemirror";
import { useContext, useEffect, useRef } from "preact/hooks";
import styled from "styled-components";
import { ExtensionBuilder } from "../extensions";
import { unifiedMergeView } from "@codemirror/merge";
import { CodeEditor } from "../components/CodeMirror";
import { MystState } from "../mystState";
import { Modal } from "../components/CommonUI";

const CommitForm = styled(Modal)`
  && {
    width: 800px;
  }

  form {
    margin-top: 20px;
  }

  label,
  input,
  textarea {
    display: block;
  }

  label {
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-secondary);
  }

  textarea,
  input {
    padding: 6px 8px;
    font-family: inherit;
    font-size: 14px;
    color: var(--ink);
    width: 100%;
    box-sizing: border-box;
    background-color: var(--paper);
    border: 1px solid var(--gray-300);
    border-radius: var(--radius);
    transition:
      border-color 0.12s ease,
      box-shadow 0.12s ease;

    &:focus-visible {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-light);
    }
  }

  input {
    margin-bottom: 16px;
  }

  button {
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    color: var(--ink);
    border: 1px solid var(--gray-300);
    background-color: var(--paper);
    height: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0 10px;
    transition: background-color 0.12s ease;
    border-radius: var(--radius);

    &:hover:not(:disabled) {
      background-color: var(--hover);
    }

    &:disabled {
      color: var(--ink-faint);
      cursor: not-allowed;
    }
  }

  #diffs {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .diff-parent {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .file-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .file-name {
    display: flex;
    align-items: center;
    gap: 8px;

    input,
    label {
      display: inline;
      width: fit-content;
      margin: 0;
    }

    label {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--ink);
    }

    label.unstaged {
      text-decoration: line-through;
      color: var(--ink-faint);
    }
  }
`;

const CommitModal = ({ initialSummary = "", onSubmit, onClose, documents = [], parent, latestCommit, statusSocket }) => {
  const summary = useSignal(initialSummary);
  const description = useSignal("");
  const message = useComputed(() => `${summary.value}\n\n${description.value}`);
  const changedDocs = useSignal(documents);
  const stagedDocs = useSignal(documents.map((d) => d.file));
  const modalRef = useRef();

  useEffect(() => {
    if (initialSummary) {
      summary.value = initialSummary;
      description.value = "";
      changedDocs.value = documents;
      stagedDocs.value = documents.map((d) => d.file);
      modalRef.current?.showModal?.();
      modalRef.current.onclose = onClose;
    }
  }, [initialSummary]);

  function handleStage(staged, file) {
    if (staged) {
      stagedDocs.value = [...stagedDocs.peek(), file];
    } else {
      stagedDocs.value = stagedDocs.peek().filter((f) => f !== file);
    }
  }

  return (
    <CommitForm ref={modalRef}>
      <div id="diffs">
        {/* Only mount the diff editors while the modal is open, so they are destroyed on close. */}
        {initialSummary &&
          changedDocs.value.map((d) => (
            <Diff
              key={d.file}
              parent={parent}
              document={d}
              onStage={(staged) => handleStage(staged, d.file)}
              discardFile={() => {
                handleStage(false, d.file);
                d.client.ytext.delete(0, d.client.ytext.length);
                d.client.ytext.insert(0, d.initialText);
                statusSocket.current?.send?.(d.client.provider.roomname);
                changedDocs.value = changedDocs.peek().filter((doc) => doc.file !== d.file);
                if (changedDocs.peek().length === 0) modalRef.current?.close?.();
              }}
            />
          ))}
      </div>
      {latestCommit ? (
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            if (stagedDocs.value.length === 0) return;
            modalRef.current.onclose = () => {};
            modalRef.current.close();
            onSubmit({ summary: summary.value, message: message.value, stagedDocs: stagedDocs.value });
          }}
        >
          <label htmlFor="summary">Commit summary</label>
          <input id="summary" type="text" value={summary.value} onChange={(ev) => (summary.value = ev.target.value)} autoFocus />
          <label htmlFor="description">Commit description</label>
          <textarea
            name="description"
            id="description"
            value={description.value}
            onChange={(ev) => (description.value = ev.target.value)}
            cols={80}
            rows={5}
          />
          <div className="buttons">
            <button type="submit" disabled={stagedDocs.value.length === 0}>
              Commit
            </button>
            <button type="button" onClick={() => modalRef.current.close()}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <p>You can only commit changes from the latest commit of a branch</p>
          <div className="buttons">
            <div />
            <button onClick={() => modalRef.current.close()}>Close</button>
          </div>
        </>
      )}
    </CommitForm>
  );
};

const MergeViewCodeEditor = styled(CodeEditor)``;

const Diff = ({ document, parent, onStage, discardFile }) => {
  const { options } = useContext(MystState);
  const diffRef = useRef();
  const staged = useSignal(true);

  useEffect(() => {
    if (!diffRef.current) return;
    const view = new EditorView({
      parent: diffRef.current,
      root: parent,
      doc: document.text,
      extensions: [
        ...ExtensionBuilder.basicSetup().useLanguage("markdown", options.transforms.value).useReadonly().create(),
        unifiedMergeView({
          original: document.initialText,
          mergeControls: false,
          collapseUnchanged: {
            margin: 3,
            minSize: 6,
          },
        }),
      ],
    });

    return () => {
      view.destroy();
    };
  }, [diffRef.current]);

  useSignalEffect(() => onStage(staged.value));

  return (
    <div className="diff-parent">
      <div className="file-controls">
        <div className="file-name">
          <input
            type="checkbox"
            name={document.file}
            id={document.file}
            checked={staged.value}
            onChange={(ev) => (staged.value = ev.target.checked)}
          />
          <label
            for={document.file}
            className={staged.value ? "" : "unstaged"}
            title={staged.value ? "This file will be committed" : "This file will not be committed"}
          >
            {document.file}
          </label>
        </div>
        <button onClick={() => discardFile()}>Discard changes</button>
      </div>
      {staged.value && <MergeViewCodeEditor ref={diffRef} />}
    </div>
  );
};

export default CommitModal;
