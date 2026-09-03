import { useContext } from "preact/hooks";
import styled from "styled-components";
import { MystState } from "../mystState";
import { useSignalEffect } from "@preact/signals";
import { scrollToPos } from "../utils";

const Wrapper = styled.div`
  background-color: var(--sidebar-bg);
  padding: 28px 24px 40px;
  box-sizing: border-box;
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  color: var(--ink);

  & > h1 {
    margin: 0;
    padding: 0;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.02em;
    color: var(--ink-tertiary);
  }
`;

const VerticalSparator = styled.hr`
  border: none;
  height: 1px;
  background-color: var(--hairline);
  margin: 12px 0 0;
`;

/** Depth is expressed by indent and text size only — no bullets, rules, or numbering, so the
 * outline reads as a quiet index rather than a second document. */
const HeadingList = styled.div`
  margin: 8px 0 0;

  ul {
    list-style: none;
    margin: 0;
    padding-left: 14px;
  }

  & > ul {
    padding-left: 0;
  }

  li > span {
    display: block;
    padding: 3px 6px;
    margin-left: -6px;
    border-radius: var(--radius);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.45;
    color: var(--ink-secondary);
    user-select: none;
    cursor: pointer;

    &:hover {
      background: var(--hover);
      color: var(--ink);
    }
  }

  & > ul > li > span {
    font-size: 14px;
    font-weight: 500;
    color: var(--ink);
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
      <span title="Go to heading" data-heading-pos={heading.pos}>
        {heading.text}
      </span>
      {children}
    </li>
  );
}

export const TableOfContents = () => {
  const { headings, editorView, options, text } = useContext(MystState);

  useSignalEffect(() => console.log(headings.value));

  function handleClick(ev) {
    const posAttr = ev.target?.dataset?.headingPos;
    if (!posAttr) return;
    scrollToPos(parseInt(posAttr, 10), { editorView, options, text });
  }

  return (
    <Wrapper>
      <h1>Table of Contents</h1>
      <VerticalSparator />
      <HeadingList onClick={handleClick}>
        <ul>
          {headings.value.map((h) => (
            <Heading heading={h} key={h.pos} />
          ))}
        </ul>
      </HeadingList>
    </Wrapper>
  );
};
