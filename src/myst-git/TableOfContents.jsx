import styled from "styled-components";
import { useContext } from "preact/hooks";
import { MystState } from "../mystState";
import { useComputed } from "@preact/signals";
import { scrollToPos } from "../utils";

/** Rows highlight on hover instead of underlining, and nesting is shown by indent alone, so the
 * page index reads like a Notion sidebar rather than a list of links. */
const List = styled.div`
  font-size: 13px;
  width: 100%;
  color: var(--ink);

  .active {
    color: var(--ink);
    font-weight: 500;
  }

  .file,
  .heading {
    display: block;
    padding: 4px 6px;
    margin-left: -6px;
    border-radius: var(--radius);
    color: var(--ink-secondary);
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;

    &:hover {
      background-color: var(--hover);
      color: var(--ink);
    }
  }

  p {
    margin: 0 0 8px;
    font-weight: 500;
    font-size: 12px;
    letter-spacing: 0.02em;
    color: var(--ink-tertiary);
  }

  ul {
    list-style: none;
    padding-left: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;

    li {
      font-size: 13px;

      .marked::after {
        content: "";
        display: inline-block;
        margin-left: 6px;
        width: 5px;
        height: 5px;
        border-radius: 100%;
        background-color: var(--accent);
      }
    }
  }

  #headings {
    &,
    & ul {
      padding-left: 14px;
      margin-top: 1px;
    }
  }
`;

function Heading({ heading }) {
  let children;
  if (heading.children.length > 0) {
    children = (
      <ul>
        {heading.children.map((c) => (
          <Heading key={c.pos} heading={c} />
        ))}
      </ul>
    );
  }

  return (
    <li>
      <span title="Go to heading" className="heading" data-heading-pos={heading.pos}>
        {heading.text}
      </span>
      {children}
    </li>
  );
}

export const TableOfContents = ({ pageIndex, markedFiles, currentFile, onFileClick }) => {
  const { headings, editorView, options, text } = useContext(MystState);
  const fileList = pageIndex;

  const fileHeadings = useComputed(() => headings.value.flatMap((h, i) => (i == 0 && h.level == 1 && h.pos === 0 ? h.children : h)));

  function handleHeadingClick(ev) {
    const posAttr = ev.target?.dataset?.headingPos;
    if (!posAttr) return;
    scrollToPos(parseInt(posAttr, 10), { editorView, options, text });
  }

  return (
    <List>
      <p>Page index</p>
      <ul>
        {fileList.value.map((f) => {
          let fileLabel = f.title;
          if (f.file === currentFile) {
            // Use first h1 heading as file label if possible
            if (headings.value[0]?.level === 1 && headings.value[0]?.pos === 0) {
              fileLabel = headings.value[0].text;
            } else {
              // Otherwise use the file path
              fileLabel = currentFile;
            }
          }

          return (
            <li key={f.file}>
              <span
                className={`file ${currentFile.startsWith(f.file) ? "active" : ""} ${markedFiles.value.includes(f.file) ? "marked" : ""}`}
                title={f.description || `Go to file ${f.file}`}
                onClick={() => onFileClick(f)}
              >
                {fileLabel}
              </span>
              {currentFile.startsWith(f.file) && (
                <ul id="headings" onClick={handleHeadingClick}>
                  {fileHeadings.value.map((h) => (
                    <Heading heading={h} key={h.pos} />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </List>
  );
};
