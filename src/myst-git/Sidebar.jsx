import styled from "styled-components";
import { TableOfContents } from "./TableOfContents";

const GitSidebar = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 24px 16px 32px;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  gap: 24px;
  background-color: var(--sidebar-bg);
  color: var(--ink);
`;

const UnindexedFiles = styled.details`
  width: 100%;

  summary {
    font-weight: 500;
    font-size: 12px;
    color: var(--ink-tertiary);
    user-select: none;
    cursor: pointer;
  }

  ul {
    list-style: none;
    padding-left: 0;
    margin: 8px 0 0;

    li {
      display: flex;
      align-items: center;
      padding: 4px 6px;
      border-radius: var(--radius);
      font-size: 13px;
      color: var(--ink-secondary);
      cursor: pointer;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      &.active {
        background-color: var(--active);
        color: var(--ink);
        font-weight: 500;
      }

      &.marked::after {
        content: "";
        display: inline-block;
        flex: none;
        margin-left: 6px;
        width: 5px;
        height: 5px;
        border-radius: 100%;
        background-color: var(--accent);
      }

      &:hover {
        background-color: var(--hover);
        color: var(--ink);
      }
    }
  }
`;

// Page-index data and `switchFile` are computed in MystEditorGit and passed in so an external integration can reuse them.
const Sidebar = ({ file, indexFile, pageIndex, unIndexedFiles, markedFiles, switchFile }) => {
  return (
    <GitSidebar>
      {indexFile.value && file.value && (
        <TableOfContents pageIndex={pageIndex} markedFiles={markedFiles} currentFile={file.value} onFileClick={(f) => switchFile(f.file)} />
      )}
      {unIndexedFiles.value.length > 0 && (
        <UnindexedFiles>
          <summary>Unindexed files</summary>
          <ul id="unindexed-files-list">
            {unIndexedFiles.value.map((f) => (
              <li
                key={f}
                title="Go to file"
                onClick={() => switchFile(f)}
                className={`${file.value == f ? "active" : ""} ${markedFiles.value.includes(f) ? "marked" : ""}`}
              >
                {f}
              </li>
            ))}
          </ul>
        </UnindexedFiles>
      )}
    </GitSidebar>
  );
};

export default Sidebar;
