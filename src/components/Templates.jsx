import { useContext, useRef } from "preact/hooks";
import { createPortal } from "preact/compat";
import { css, styled } from "styled-components";
import { MystState } from "../mystState.js";
import { DefaultButton, Modal } from "./CommonUI.js";
import { useSignal, useSignalEffect } from "@preact/signals";

const TemplatesList = styled.div`
  min-width: 220px;

  h1 {
    margin: 0 0 4px;
    padding: 0 8px;
    color: var(--ink-tertiary);
    font-size: 13px;
    font-weight: 500;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
`;

const TemplateButton = styled(DefaultButton)`
  width: 100%;
  justify-content: flex-start;
  color: ${(props) => (props.error ? "var(--tag-red-fg)" : "var(--ink)")};
  font-weight: 400;

  ${(props) =>
    props.error &&
    css`
      &:hover:not(:disabled) {
        background-color: var(--tag-red-bg);
        color: var(--tag-red-fg);
      }
    `}
`;

async function fetchTemplates(templateListUrl) {
  const res = await fetch(templateListUrl);
  if (!res.ok) throw new Error(`${res.status} Failed to fetch templates`);
  const templates = await res.json();
  for (const key in templates) {
    if (templates[key].id == undefined) templates[key].error = "Missing id field";
    if (templates[key].templatetext == undefined) templates[key].error = "Missing templatetext field";
    if (templates[key].error) continue;

    try {
      const res = await fetch(templates[key].templatetext);
      if (!res.ok) throw new Error(`${res.status} Failed to fetch template text`);
      templates[key].templatetext = await res.text();
    } catch (err) {
      templates[key].error = err;
    }
  }

  return templates;
}

const Templates = () => {
  const { options, editorView } = useContext(MystState);
  const templates = useSignal({});
  const selectedTemplate = useSignal(null);
  const modalRef = useRef(null);
  const modalHost = options.parent.querySelector("#myst-css-namespace");

  useSignalEffect(() => {
    if (!options.templatelist.value) {
      options.includeButtons.value = options.includeButtons.peek().filter((b) => b.id != "templates");
      return;
    }

    selectedTemplate.value = null;
    fetchTemplates(options.templatelist.value)
      .then((t) => (templates.value = t))
      .catch((err) => {
        console.error(err);
        options.includeButtons.value = options.includeButtons.peek().filter((b) => b.id != "templates");
      });
  });

  useSignalEffect(() => {
    if (selectedTemplate.value) modalRef.current?.showModal?.();
    else modalRef.current?.close?.();
  });

  return (
    <>
      <TemplatesList>
        <h1>Templates</h1>
        <div className="list">
          {Object.values(templates.value).map((template) => (
            <TemplateButton
              type="button"
              key={template.id}
              error={template.error != undefined}
              title={template.error ?? "Apply template"}
              disabled={template.error}
              onClick={() => (selectedTemplate.value = template)}
            >
              {template.id}
            </TemplateButton>
          ))}
        </div>
      </TemplatesList>
      {modalHost &&
        createPortal(
          <Modal ref={modalRef} onClose={() => (selectedTemplate.value = null)}>
            <h3>
              Are you sure you want to apply the {selectedTemplate.value?.id} template? It will replace the current document and remove all comments.
            </h3>
            <div className="buttons">
              <DefaultButton onClick={() => (selectedTemplate.value = null)}>No, cancel</DefaultButton>
              <DefaultButton
                $variant="primary"
                onClick={() => {
                  editorView.value.dispatch({
                    changes: { from: 0, to: editorView.value.state.doc.length, insert: selectedTemplate.value.templatetext },
                  });
                  selectedTemplate.value = null;
                }}
              >
                Yes, apply
              </DefaultButton>
            </div>
          </Modal>,
          modalHost,
        )}
    </>
  );
};

export default Templates;
