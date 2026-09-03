import { styled } from "styled-components";
import { useContext, useMemo, useRef } from "preact/hooks";
import purify from "dompurify";

import { DefaultButton, IconButton } from "./CommonUI";
import ButtonGroup from "./ButtonGroup";
import { MystState } from "../mystState";
import { useComputed, useSignal } from "@preact/signals";

const APP_NAME = "Potter's Wheel";

const renderMdLinks = (title) =>
  [...(title || "").matchAll(/\[(.+)\]\(([^\s]+)\)/g)].reduce(
    (prev, match) => prev.replace(match[0], `<a href="${match[2]}">${match[1]}</a>`),
    title,
  );

const Topbar = styled.div`
  z-index: 10;
  position: sticky;
  top: 0;
  padding: 0 12px;
  width: 100%;
  height: 45px;
  background-color: var(--navbar-bg);
  border-bottom: 1px solid var(--hairline);

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-sizing: border-box;

  /* Both sides stop clear of the centered wordmark's half-width plus a gutter, so a long paper
     title truncates instead of colliding with the brand. */
  .side {
    display: flex;
    align-items: center;
    gap: 2px;
    min-width: 0;
    max-width: calc(50% - 68px);

    &:first-child {
      flex: 1 1 auto;
      gap: 8px;
    }

    &:last-child {
      flex: 0 0 auto;
      gap: 6px;
    }
  }

  .btns,
  .icon-btns {
    display: flex;
    align-items: center;
    gap: 1px;
  }

  /* The copy glyph is two overlapping sheets; the front one needs an opaque fill to mask the
     back one, so it tracks whatever surface sits behind the button. */
  svg > path.inner-copy {
    fill: var(--navbar-bg);
    transition: fill 20ms ease-in;
  }

  /* On hover the button lays a translucent ink wash over the bar, so the mask has to be mixed to
     match rather than hardcoded — otherwise it stays light against the dark theme. */
  button:hover > svg > path.inner-copy {
    fill: color-mix(in srgb, var(--navbar-bg), var(--ink) 5.5%);
  }

  .btn-dropdown {
    position: absolute;
    top: 40px;
    padding-top: 6px;
    display: none;
    z-index: 20;

    &:hover {
      display: block;
    }

    .dropdown-content {
      padding: 8px;
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-menu);
      background: var(--modal-bg);
    }
  }

  @media print {
    & {
      display: none;
    }
  }
`;

/** Breadcrumb rather than a stacked title/subtitle block: one line reads faster and keeps the
 * header at a single row height. */
const TitleBlock = styled.div`
  display: flex;
  align-items: baseline;
  gap: 7px;
  min-width: 0;
  overflow: hidden;
`;

const EditableTitle = styled.input`
  width: clamp(170px, 27vw, 430px);
  min-width: 0;
  height: 29px;
  padding: 0 4px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink);
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  text-overflow: ellipsis;

  &:hover {
    background: var(--hover);
  }

  &:focus {
    border-color: var(--accent);
    background: var(--paper);
    outline: none;
  }
`;

/** The product name is the bar's centered anchor and is set in the logotype's serif, so it reads
 * as branding rather than as another piece of document metadata. Absolute rather than a third
 * flex child, so it centers on the bar itself instead of on whatever space the sides leave over.
 *
 * This is the app's own identity, not document state, which is why it is a constant here rather
 * than one of the `options` an integrator passes in. */
const BrandWordmark = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: var(--ink-secondary);
  font-family: Georgia, "Iowan Old Style", "Times New Roman", serif;
  font-size: 15px;
  font-weight: 400;
  letter-spacing: 0.01em;
  white-space: nowrap;
  pointer-events: none;
  user-select: none;

  /* Under ~1100px the action cluster reaches close enough to the midpoint that a centered element
     reads as part of it rather than as centered, so it is dropped instead. */
  @media (max-width: 1100px) {
    display: none;
  }
`;

const Crumb = styled.div`
  min-width: 0;
  overflow: hidden;
  color: ${(props) => (props.$muted ? "var(--ink-tertiary)" : "var(--ink)")};
  font-size: 14px;
  font-weight: ${(props) => (props.$muted ? 400 : 500)};
  white-space: nowrap;
  text-overflow: ellipsis;

  a {
    color: inherit;
    text-decoration: underline;
    text-decoration-color: var(--gray-400);
  }

  .git-branch-link,
  .git-commit-link {
    cursor: pointer;
    color: var(--accent-dark);

    &:hover {
      text-decoration: underline;
    }
  }
`;

const CrumbSep = styled.span`
  flex: 0 0 auto;
  color: var(--gray-400);
  font-size: 14px;
`;

const Separator = styled.div`
  flex: 0 0 auto;
  width: 1px;
  height: 18px;
  margin: 0 9px;
  background: var(--hairline);
`;

const DemoLabel = styled.span`
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  border: 1px solid var(--hairline);
  border-radius: 999px;
  color: var(--ink-tertiary);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.02em;
  line-height: 1;
  user-select: none;
`;

const Alert = styled.span`
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  height: 22px;
  padding: 0 8px;
  border-radius: var(--radius-sm);
  background: var(--tag-green-bg);
  color: var(--tag-green-fg);
  font-size: 13px;
  white-space: nowrap;
  pointer-events: none;
`;

const Overflow = styled.details`
  position: relative;

  > summary {
    display: grid;
    width: 28px;
    height: 28px;
    padding: 0;
    place-items: center;
    border-radius: var(--radius);
    color: var(--ink-secondary);
    cursor: pointer;
    list-style: none;

    &::-webkit-details-marker {
      display: none;
    }

    &:hover {
      background: var(--hover);
      color: var(--ink);
    }

    &:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 1px;
    }

    svg {
      width: 18px;
      height: 18px;
    }
  }

  &[open] > summary {
    background: var(--selected);
    color: var(--accent-dark);
  }
`;

const OverflowPanel = styled.div`
  position: absolute;
  z-index: 30;
  top: 34px;
  right: 0;
  width: 230px;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--modal-bg);
  box-shadow: var(--shadow-menu);
`;

const OverflowItem = styled(DefaultButton)`
  width: 100%;
  height: 32px;
  padding: 0 8px;
  justify-content: flex-start;
  color: var(--ink);
  font-weight: 400;

  svg,
  img {
    width: 16px;
    height: 16px;
    flex: 0 0 16px;
    color: var(--ink-tertiary);
    object-fit: contain;
  }
`;

const OverflowSection = styled.div`
  margin: 5px 8px 3px;
  color: var(--ink-tertiary);
  font-size: 11px;
  font-weight: 500;
`;

const NestedOverflow = styled.details`
  > summary {
    list-style: none;

    &::-webkit-details-marker {
      display: none;
    }
  }

  .nested-options {
    max-height: 360px;
    margin: 4px 0 7px;
    padding: 8px;
    overflow-y: auto;
    border-top: 1px solid var(--hairline);
    border-bottom: 1px solid var(--hairline);
  }
`;

export const TopbarButton = styled(IconButton)`
  &:hover ~ .btn-dropdown {
    display: block;
  }

  /* Integrator-supplied icons arrive at arbitrary intrinsic sizes; match the inline SVGs so one
     custom button can't throw off the rhythm of the row. */
  img {
    width: 16px;
    height: 16px;
    flex: 0 0 auto;
    object-fit: contain;
  }
`;

const ExitIcon = () => (
  <svg width="22" height="22" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clip-path="url(#clip0_367_5917)">
      <path
        d="M12.6667 4.27331L11.7267 3.33331L8.00004 7.05998L4.27337 3.33331L3.33337 4.27331L7.06004 7.99998L3.33337 11.7266L4.27337 12.6666L8.00004 8.93998L11.7267 12.6666L12.6667 11.7266L8.94004 7.99998L12.6667 4.27331Z"
        fill="currentColor"
      />
    </g>
    <defs>
      <clipPath id="clip0_367_5917">
        <rect width="16" height="16" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

const FullscreenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path d="M20.35 1.78003L12.61 9.51003" stroke-width="1.75" stroke="currentColor" />
    <path d="M14.88 1.08008H20.89V7.27008" stroke-width="1.75" stroke="currentColor" />
    <path d="M1.42999 20.3601L9.16999 12.6301" stroke-width="1.75" stroke="currentColor" />
    <path d="M6.90002 21.0601H0.890015V14.8701" stroke-width="1.75" stroke="currentColor" />
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24">
    <g fill="currentColor" fill-rule="evenodd" clip-rule="evenodd">
      <path d="M12 8.25a3.75 3.75 0 1 0 0 7.5a3.75 3.75 0 0 0 0-7.5M9.75 12a2.25 2.25 0 1 1 4.5 0a2.25 2.25 0 0 1-4.5 0" />
      <path d="M11.975 1.25c-.445 0-.816 0-1.12.02a2.8 2.8 0 0 0-.907.19a2.75 2.75 0 0 0-1.489 1.488c-.145.35-.184.72-.2 1.122a.87.87 0 0 1-.415.731a.87.87 0 0 1-.841-.005c-.356-.188-.696-.339-1.072-.389a2.75 2.75 0 0 0-2.033.545a2.8 2.8 0 0 0-.617.691c-.17.254-.356.575-.578.96l-.025.044c-.223.385-.408.706-.542.98c-.14.286-.25.568-.29.88a2.75 2.75 0 0 0 .544 2.033c.231.301.532.52.872.734a.87.87 0 0 1 .426.726a.87.87 0 0 1-.426.726c-.34.214-.64.433-.872.734a2.75 2.75 0 0 0-.545 2.033c.041.312.15.594.29.88c.135.274.32.595.543.98l.025.044c.222.385.408.706.578.96c.177.263.367.5.617.69a2.75 2.75 0 0 0 2.033.546c.376-.05.716-.2 1.072-.389a.87.87 0 0 1 .84-.005a.86.86 0 0 1 .417.731c.015.402.054.772.2 1.122a2.75 2.75 0 0 0 1.488 1.489c.29.12.59.167.907.188c.304.021.675.021 1.12.021h.05c.445 0 .816 0 1.12-.02c.318-.022.617-.069.907-.19a2.75 2.75 0 0 0 1.489-1.488c.145-.35.184-.72.2-1.122a.87.87 0 0 1 .415-.732a.87.87 0 0 1 .841.006c.356.188.696.339 1.072.388a2.75 2.75 0 0 0 2.033-.544c.25-.192.44-.428.617-.691c.17-.254.356-.575.578-.96l.025-.044c.223-.385.408-.706.542-.98c.14-.286.25-.569.29-.88a2.75 2.75 0 0 0-.544-2.033c-.231-.301-.532-.52-.872-.734a.87.87 0 0 1-.426-.726c0-.278.152-.554.426-.726c.34-.214.64-.433.872-.734a2.75 2.75 0 0 0 .545-2.033a2.8 2.8 0 0 0-.29-.88a18 18 0 0 0-.543-.98l-.025-.044a18 18 0 0 0-.578-.96a2.8 2.8 0 0 0-.617-.69a2.75 2.75 0 0 0-2.033-.546c-.376.05-.716.2-1.072.389a.87.87 0 0 1-.84.005a.87.87 0 0 1-.417-.731c-.015-.402-.054-.772-.2-1.122a2.75 2.75 0 0 0-1.488-1.489c-.29-.12-.59-.167-.907-.188c-.304-.021-.675-.021-1.12-.021zm-1.453 1.595c.077-.032.194-.061.435-.078c.247-.017.567-.017 1.043-.017s.796 0 1.043.017c.241.017.358.046.435.078c.307.127.55.37.677.677c.04.096.073.247.086.604c.03.792.439 1.555 1.165 1.974s1.591.392 2.292.022c.316-.167.463-.214.567-.227a1.25 1.25 0 0 1 .924.247c.066.051.15.138.285.338c.139.206.299.483.537.895s.397.69.506.912c.107.217.14.333.15.416a1.25 1.25 0 0 1-.247.924c-.064.083-.178.187-.48.377c-.672.422-1.128 1.158-1.128 1.996s.456 1.574 1.128 1.996c.302.19.416.294.48.377c.202.263.29.595.247.924c-.01.083-.044.2-.15.416c-.109.223-.268.5-.506.912s-.399.689-.537.895c-.135.2-.219.287-.285.338a1.25 1.25 0 0 1-.924.247c-.104-.013-.25-.06-.567-.227c-.7-.37-1.566-.398-2.292.021s-1.135 1.183-1.165 1.975c-.013.357-.046.508-.086.604a1.25 1.25 0 0 1-.677.677c-.077.032-.194.061-.435.078c-.247.017-.567.017-1.043.017s-.796 0-1.043-.017c-.241-.017-.358-.046-.435-.078a1.25 1.25 0 0 1-.677-.677c-.04-.096-.073-.247-.086-.604c-.03-.792-.439-1.555-1.165-1.974s-1.591-.392-2.292-.022c-.316.167-.463.214-.567.227a1.25 1.25 0 0 1-.924-.247c-.066-.051-.15-.138-.285-.338a17 17 0 0 1-.537-.895c-.238-.412-.397-.69-.506-.912c-.107-.217-.14-.333-.15-.416a1.25 1.25 0 0 1 .247-.924c.064-.083.178-.187.48-.377c.672-.422 1.128-1.158 1.128-1.996s-.456-1.574-1.128-1.996c-.302-.19-.416-.294-.48-.377a1.25 1.25 0 0 1-.247-.924c.01-.083.044-.2.15-.416c.109-.223.268-.5.506-.912s.399-.689.537-.895c.135-.2.219-.287.285-.338a1.25 1.25 0 0 1 .924-.247c.104.013.25.06.567.227c.7.37 1.566.398 2.292-.022c.726-.419 1.135-1.182 1.165-1.974c.013-.357.046-.508.086-.604c.127-.307.37-.55.677-.677" />
    </g>
  </svg>
);

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="22" viewBox="0 0 20 22" fill="none">
    <path d="M13.99 1.04004H1.37V16.64H13.99V1.04004Z" stroke-width="1.75" stroke="currentColor" />
    <path class="inner-copy" d="M18.63 5.51001H6.01001V21.11H18.63V5.51001Z" stroke-width="1.75" stroke="currentColor" fill="var(--navbar-bg)" />
  </svg>
);

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 23 23" fill="none">
    <path d="M21.75 1V7.66H14.9" stroke-width="1.75" stroke="currentColor" />
    <path
      d="M21.65 12.5899C20.95 17.4199 16.78 21.1399 11.75 21.1399C6.23 21.1399 1.75 16.6599 1.75 11.1399C1.75 5.61989 6.23 1.13989 11.75 1.13989C16.24 1.13989 20.03 4.09989 21.3 8.16989"
      stroke-width="1.75"
      stroke="currentColor"
    />
  </svg>
);

const PrintPDFIcon = () => (
  <svg width="21" height="22" viewBox="0 0 21 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path stroke-width="0.2" d="M21 12.4286V11H16.7143V18.1429H18.1429V15.2857H20.2857V13.8571H18.1429V12.4286H21Z" fill="currentColor" />
    <path
      stroke-width="0.2"
      d="M13.1428 18.1429H10.2857V11H13.1428C14.3571 11 15.2857 11.9286 15.2857 13.1429V16C15.2857 17.2143 14.3571 18.1429 13.1428 18.1429ZM11.7143 16.7143H13.1428C13.5714 16.7143 13.8571 16.4286 13.8571 16V13.1429C13.8571 12.7143 13.5714 12.4286 13.1428 12.4286H11.7143V16.7143Z"
      fill="currentColor"
    />
    <path
      stroke-width="0.2"
      d="M7.42855 11H3.85712V18.1429H5.28569V16H7.42855C8.21426 16 8.85712 15.3571 8.85712 14.5714V12.4286C8.85712 11.6429 8.21426 11 7.42855 11ZM5.28569 14.5714V12.4286H7.42855V14.5714H5.28569Z"
      fill="currentColor"
    />
    <path d="M14 21H9.5H1V1H9M15 10V7.5M9 1H9.5L15 6.5V7.5M9 1V7.5H15" stroke="currentColor" stroke-width="1.75" />
  </svg>
);

const TemplatesIcon = () => (
  <svg width="20" height="22" viewBox="0 0 20 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 16L11 16" stroke="currentColor" stroke-width="1.75" />
    <path d="M1 21H10H19V12V6.5L13.5 1H1V6.5V12V21Z" stroke="currentColor" stroke-width="1.75" stroke-dasharray="6 3" />
    <path d="M5 12L15 12" stroke="currentColor" stroke-width="1.75" />
    <path d="M5 8L15 8" stroke="currentColor" stroke-width="1.75" />
  </svg>
);

const SourceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="21" height="15" viewBox="0 0 21 15" fill="none">
    <path d="M15.31 2.8501L19.56 7.1001L15.19 11.4801" stroke-width="1.75" stroke="currentColor" />
    <path d="M5.75 11.4801L1.5 7.2201L5.88 2.8501" stroke-width="1.75" stroke="currentColor" />
    <path d="M12.35 0.340088L8.72 13.9901" stroke-width="1.75" stroke="currentColor" />
  </svg>
);

const PreviewIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="26" height="18" viewBox="0 0 26 18" fill="none">
    <path
      d="M13.01 11.5902C14.5675 11.5902 15.83 10.3276 15.83 8.7702C15.83 7.21275 14.5675 5.9502 13.01 5.9502C11.4526 5.9502 10.1899 7.21275 10.1899 8.7702C10.1899 10.3276 11.4526 11.5902 13.01 11.5902Z"
      stroke-width="1.75"
      stroke="currentColor"
    />
    <path
      d="M23.4301 9.80018C23.4301 9.80018 13.75 24.5402 2.58997 9.80018L1.98999 8.95018L2.59998 8.10018C2.59998 8.10018 12.2799 -6.63982 23.4399 8.10018L24.01 8.90018L23.4301 9.80018Z"
      stroke-width="1.75"
      stroke="currentColor"
    />
  </svg>
);

const BothIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="23" height="18" viewBox="0 0 23 18" fill="none">
    <path d="M21.84 1.65015H1.83997V16.6701H21.84V1.65015Z" stroke-width="1.75" stroke="currentColor" />
    <path d="M11.84 1.83008V16.6701" stroke-width="1.75" stroke="currentColor" />
  </svg>
);

const InlinePreviewIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
    <path d="M120-240v-80h520v80H120Zm664-40L584-480l200-200 56 56-144 144 144 144-56 56ZM120-440v-80h400v80H120Zm0-200v-80h520v80H120Z" />
  </svg>
);

const DiffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="16" viewBox="0 0 24 16" fill="none">
    <path d="M21.23 11.0801H10.29" stroke-width="1.75" stroke="currentColor" />
    <path d="M17.86 6.71997L22.11 10.97L17.73 15.35" stroke-width="1.75" stroke="currentColor" />
    <path d="M2.22998 5.09009H13.17" stroke-width="1.75" stroke="currentColor" />
    <path d="M5.60999 9.44007L1.35999 5.19007L5.73999 0.820068" stroke-width="1.75" stroke="currentColor" />
  </svg>
);

const TocIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M16 12H3M16 18H3M16 6H3M21 12H21.01M21 18H21.01M21 6H21.01"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

const ResolvedIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="26" height="17" viewBox="0.5 -1 17 17" fill="none">
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M6.38496 5.09174C5.90507 5.09174 5.51465 5.48216 5.51465 5.96205C5.51465 6.18979 5.60412 6.41754 5.76679 6.58021C5.92947 6.74289 6.14908 6.83236 6.38496 6.83236C6.62084 6.83236 6.84045 6.74289 7.00313 6.58021C7.1658 6.41754 7.25527 6.19793 7.25527 5.96205C7.25527 5.48216 6.86485 5.09174 6.38496 5.09174Z"
      fill="currentColor"
    />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M8.99629 5.09174C8.5164 5.09174 8.12598 5.48216 8.12598 5.96205C8.12598 6.18979 8.21545 6.41754 8.37812 6.58021C8.5408 6.74289 8.76041 6.83236 8.99629 6.83236C9.23217 6.83236 9.45178 6.74289 9.61445 6.58021C9.77713 6.41754 9.8666 6.19793 9.8666 5.96205C9.8666 5.48216 9.47618 5.09174 8.99629 5.09174Z"
      fill="currentColor"
    />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M11.6066 5.09174C11.1267 5.09174 10.7363 5.48216 10.7363 5.96205C10.7363 6.18979 10.8258 6.41754 10.9885 6.58021C11.1511 6.74289 11.3708 6.83236 11.6066 6.83236C11.8425 6.83236 12.0621 6.74289 12.2248 6.58021C12.3875 6.41754 12.477 6.19793 12.477 5.96205C12.477 5.48216 12.0865 5.09174 11.6066 5.09174Z"
      fill="currentColor"
    />
    <path
      d="M17.1298 11.0375V0.862183H0.862305V10.8748L5.11626 10.9155L9.053 14.8522L12.884 11.0294L17.1298 11.0375Z"
      stroke="currentColor"
      stroke-width="1.5"
    />
  </svg>
);

const SuggestIcon = () => (
  <svg width="19" height="21" viewBox="0 0 19 21" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M2.08422 16.0583L1.31738 19.2613L4.6646 18.4945M2.08422 16.0583L14.6334 2L17.3174 4.48441L4.6646 18.4945M2.08422 16.0583L4.6646 18.4945"
      stroke="currentColor"
      stroke-width="1.75"
    />
  </svg>
);

const IntegrityIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3L20 6.5V12.2C20 16.8 16.9 20.6 12 22C7.1 20.6 4 16.8 4 12.2V6.5L12 3Z" stroke="currentColor" stroke-width="1.7" />
    <path d="M8 12L10.6 14.6L16.4 8.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

const MoreIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="19" cy="12" r="1.5" />
  </svg>
);

const icons = {
  "integrity-panel": IntegrityIcon,
  fullscreen: FullscreenIcon,
  "copy-html": CopyIcon,
  refresh: RefreshIcon,
  "print-to-pdf": PrintPDFIcon,
  settings: SettingsIcon,
  templates: TemplatesIcon,
  "suggest-mode": SuggestIcon,
};

export const EditorTopbar = ({ alert, buttons }) => {
  const { options, editorView, workspaceView } = useContext(MystState);
  const subtitleHtml = useComputed(() => purify.sanitize(renderMdLinks(options.subtitle.value)));
  const emptyDiff = useSignal(false);
  const overflowRef = useRef(null);
  const showEditorMode = (mode) => {
    workspaceView.value = "paper";
    options.mode.value = mode;
  };
  const editorModeButtons = useComputed(() => {
    const modeButtons = [
      { id: "source", tooltip: "Source", action: () => showEditorMode("Source"), icon: SourceIcon },
      { id: "preview", tooltip: "Preview", action: () => showEditorMode("Preview"), icon: PreviewIcon },
      { id: "both", tooltip: "Dual Pane", action: () => showEditorMode("Both"), icon: BothIcon },
      { id: "inline", tooltip: "Inline Preview", action: () => showEditorMode("Inline"), icon: InlinePreviewIcon },
      {
        id: "diff",
        tooltip: emptyDiff.value ? "No changes to show" : null,
        text: "Diff View",
        disabled: emptyDiff.value,
        action: () => showEditorMode("Diff"),
        hover: () => (emptyDiff.value = options.initialText.value == editorView.value?.state?.doc?.toString?.()),
        icon: DiffIcon,
      },
      { id: "outline", text: "Table of Contents", action: () => showEditorMode("Outline"), icon: TocIcon },
    ];
    if (options.collaboration.value.resolvingCommentsEnabled) {
      modeButtons.push({ id: "resolved", text: "Resolved", action: () => showEditorMode("Resolved"), icon: ResolvedIcon });
    }

    return modeButtons;
  });
  const clickedId = useComputed(() => editorModeButtons.value.findIndex((b) => b.id[0].toUpperCase() + b.id.slice(1) === options.mode.value));
  const buttonsLeft = useMemo(() => buttons.map((b) => ({ ...b, icon: b.icon || icons[b.id] })).filter((b) => b.icon), [buttons]);
  const utilityButtons = buttonsLeft.filter((button) => button.id !== "integrity-panel");
  const textButtons = useMemo(() => buttons.filter((b) => b.text), [buttons]);
  const closeOverflow = () => overflowRef.current?.removeAttribute("open");
  const commitTitle = (rawTitle) => {
    const nextTitle = rawTitle.trim() || "Untitled manuscript";
    options.title.value = nextTitle;

    const view = editorView.value;
    const documentText = view?.state?.doc?.toString?.();
    if (!documentText?.startsWith("---\n")) return;
    const frontmatterEnd = documentText.indexOf("\n---", 4);
    if (frontmatterEnd < 0) return;
    const titleMatch = /^title:.*$/m.exec(documentText.slice(0, frontmatterEnd));
    if (!titleMatch) return;
    const replacement = `title: ${JSON.stringify(nextTitle)}`;
    if (titleMatch[0] === replacement) return;
    view.dispatch({ changes: { from: titleMatch.index, to: titleMatch.index + titleMatch[0].length, insert: replacement } });
  };

  return (
    <Topbar id="topbar">
      <div className="side">
        {options.showTitle.value && (
          <TitleBlock>
            <EditableTitle
              aria-label="Document title"
              id="document-title"
              title="Edit document title"
              value={options.title.value}
              onInput={(event) => (options.title.value = event.currentTarget.value)}
              onBlur={(event) => commitTitle(event.currentTarget.value)}
              onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
            />
            {options.subtitle.value && (
              <>
                <CrumbSep aria-hidden="true" className="crumb-sep">
                  /
                </CrumbSep>
                <Crumb
                  $muted
                  id="document-subtitle"
                  dangerouslySetInnerHTML={{ __html: subtitleHtml.value }}
                  onClick={(ev) => options.onSubtitleClick.value?.(ev)}
                />
              </>
            )}
          </TitleBlock>
        )}
        {alert.value && <Alert className="topbar-alert">{alert}</Alert>}
      </div>

      <BrandWordmark className="brand-wordmark">{APP_NAME}</BrandWordmark>

      <div className="side">
        <DemoLabel>Demo</DemoLabel>
        {textButtons.length > 0 && (
          <div className="btns">
            {textButtons.map((b) => (
              <DefaultButton key={b.id} type="button" onClick={b.action}>
                {b.text}
              </DefaultButton>
            ))}
          </div>
        )}
        {options.showModeButtons.value && (
          <>
            <Separator aria-hidden="true" />
            <ButtonGroup buttons={editorModeButtons} clickedId={clickedId.value} mainButtonsNum={3} showOverflow={false} />
          </>
        )}

        <Overflow ref={overflowRef}>
          <summary aria-label="More options" title="More options">
            <MoreIcon />
          </summary>
          <OverflowPanel>
            <OverflowSection>Document</OverflowSection>
            {utilityButtons.map((button) =>
              button.dropdown ? (
                <NestedOverflow key={button.id}>
                  <summary aria-label={button.tooltip} title={button.tooltip}>
                    <OverflowItem as="span">
                      {typeof button.icon == "function" ? <button.icon /> : <img alt="" src={button.icon} />}
                      <span>{button.tooltip}</span>
                    </OverflowItem>
                  </summary>
                  <div className="nested-options">{button.dropdown()}</div>
                </NestedOverflow>
              ) : (
                <OverflowItem
                  aria-label={button.tooltip}
                  key={button.id}
                  type="button"
                  title={button.tooltip}
                  onClick={() => {
                    button.action?.();
                    closeOverflow();
                  }}
                >
                  {typeof button.icon == "function" ? <button.icon /> : <img alt="" src={button.icon} />}
                  <span>{button.tooltip}</span>
                </OverflowItem>
              ),
            )}
            {options.showModeButtons.value && editorModeButtons.value.length > 3 && (
              <>
                <OverflowSection>More views</OverflowSection>
                {editorModeButtons.value.slice(3).map((button, index) => (
                  <OverflowItem
                    $active={clickedId.value === index + 3}
                    aria-label={button.text || button.tooltip}
                    disabled={button.disabled}
                    key={button.id}
                    type="button"
                    title={button.tooltip || button.text}
                    onMouseOver={() => button.hover?.()}
                    onClick={() => {
                      button.action();
                      closeOverflow();
                    }}
                  >
                    <button.icon />
                    <span>{button.text || button.tooltip}</span>
                  </OverflowItem>
                ))}
              </>
            )}
          </OverflowPanel>
        </Overflow>

        {options.onExit.value && (
          <TopbarButton className="icon" type="button" title={"Quit"} name={"Quit"} onClick={() => options.onExit.value()}>
            <ExitIcon />
          </TopbarButton>
        )}
      </div>
    </Topbar>
  );
};
