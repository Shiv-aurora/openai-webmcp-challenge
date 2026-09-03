import styled from "styled-components";
import { Avatar } from "./Avatars";

const ResolvedLine = styled.p`
  font-size: 13px;
  padding: 10px 0 6px;
  margin-bottom: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  min-height: 18px;
  color: var(--ink-tertiary);
`;

const LineNumber = styled.span`
  color: var(--ink-faint);
  margin-right: 8px;
  font-size: 12px;
`;

/** The author's collaboration color is reduced to a left accent bar. A full tinted frame competed
 * with the resolved comment's own text at this size. */
const EntryContainer = styled.div`
  background-color: var(--paper);
  color: var(--ink);
  border: 1px solid var(--hairline);
  border-left: 3px solid ${(props) => props.color};
  border-radius: var(--radius);
  padding: 8px 10px;
  min-height: 28px;

  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    line-height: 20px;

    & > div {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    & .avatar {
      border-radius: 50%;
      border: 2px solid;
      height: 20px;
      width: 20px;
      box-sizing: border-box;
    }

    & .author {
      font-weight: 500;
      font-size: 12px;
      margin: 0;
    }

    & .action {
      font-size: 12px;
      font-weight: 400;
      line-height: 14px;
      margin: 0;
      color: var(--ink-tertiary);
    }
  }
`;

const ResolvedEntry = ({ user, lineNumber, action, className, lineText, options, children }) => {
  return (
    <div style="position: relative;" className={className}>
      <ResolvedLine>
        <LineNumber>{lineNumber}</LineNumber>
        {lineText}
      </ResolvedLine>
      <EntryContainer color={user.color}>
        <div className="topbar">
          <div>
            <Avatar {...user} />
            <span className="author">{user.name}</span>
          </div>
          <div>
            <span className="action">{action}</span>
            {options}
          </div>
        </div>
        {children}
      </EntryContainer>
    </div>
  );
};

export default ResolvedEntry;
