import { useContext } from "preact/hooks";
import styled from "styled-components";
import ResolvedComment from "./ResolvedComment";
import CommentIcon from "../icons/comment.svg";
import { MystState } from "../mystState";
import { useComputed } from "@preact/signals";
import ResolvedSuggestion from "./ResolvedSuggestion";

const ResolvedWrapper = styled.div`
  background-color: var(--sidebar-bg);
  padding: 28px 24px 40px;
  box-sizing: border-box;
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  color: var(--ink);

  & h1 {
    margin: 0;
    padding: 0;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.02em;
    color: var(--ink-tertiary);

    &.suggestions-heading {
      margin-top: 32px;
    }
  }
`;

const VerticalSparator = styled.hr`
  border: none;
  height: 1px;
  background-color: var(--hairline);
  margin: 12px 0 0;
`;

const Container = styled.div`
  margin: 12px 0 0;

  & ul,
  p {
    margin-top: 0;
  }
`;

const NoCommentsText = styled.p`
  padding: 0;
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--ink-tertiary);

  img {
    margin: 0 3px;
    height: 14px;
    transform: translateY(15%);
    filter: invert(var(--icon-invert));
  }

  span {
    color: var(--ink-secondary);
    font-size: 13px;
    margin: 0 2px;
  }
`;

function dateComparator(c1, c2) {
  return c1.resolvedDate - c2.resolvedDate;
}

const ResolvedComments = () => {
  const { collab } = useContext(MystState);
  const ycomments = collab.value.ycomments;
  const suggestions = collab.value.storedSuggestions;
  const resolvedComments = useComputed(() => ycomments.resolver().resolvedCommentsList.value.sort(dateComparator));
  const commentContents = useComputed(() =>
    resolvedComments.value.reduce((contents, { commentId }) => {
      contents[commentId] = ycomments.getTextForComment(commentId).toString();
      return contents;
    }, {}),
  );
  const authors = useComputed(() => resolvedComments.value.map((c) => ycomments.lineAuthors(c.commentId)));

  return (
    <ResolvedWrapper className="myst-resolved">
      <h1>Resolved comments</h1>
      <VerticalSparator />
      <Container>
        {resolvedComments.value.length === 0 ? (
          <NoCommentsText>
            No resolved comments yet, to resolve a comment hover over it's icon <img src={CommentIcon} /> and click <span>Resolve</span>
          </NoCommentsText>
        ) : (
          resolvedComments.value.map((c, idx) => (
            <ResolvedComment
              key={c.commentId}
              c={c}
              authors={authors.value[idx]}
              ycomments={ycomments}
              content={commentContents.value[c.commentId]}
            />
          ))
        )}
      </Container>
      <h1 className="suggestions-heading">Resolved suggestions</h1>
      <VerticalSparator />
      <Container>
        {suggestions.value.length === 0 ? (
          <NoCommentsText>No resolved suggestions yet.</NoCommentsText>
        ) : (
          suggestions.value.map((s, idx) => <ResolvedSuggestion key={idx} suggestion={s} />)
        )}
      </Container>
    </ResolvedWrapper>
  );
};

export default ResolvedComments;
