import styled, { css } from "styled-components";

/** Maps every status word used by experiments, verification, evidence and research-diff onto one of
 * six tag hues, so the same state always reads the same color no matter which surface shows it. */
export const statusTone = (status) => {
  switch (status) {
    case "completed":
    case "verified":
    case "current":
    case "accepted":
      return "green";
    case "running":
      return "blue";
    case "failed":
    case "contradicted":
    case "rejected":
      return "red";
    case "planned":
    case "needs-review":
    case "stale":
    case "unlinked":
    case "drifted":
      return "orange";
    case "in-review":
      return "purple";
    default:
      return "gray";
  }
};

export const tagColors = (status) => {
  const tone = statusTone(status);
  return { fg: `var(--tag-${tone}-fg)`, bg: `var(--tag-${tone}-bg)` };
};

/** A status word, not a control: no border, no shadow, just tinted text on a wash. */
export const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  height: 20px;
  padding: 0 7px;
  border-radius: var(--radius-sm);
  background: ${(props) => tagColors(props.$status).bg};
  color: ${(props) => tagColors(props.$status).fg};
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  text-transform: lowercase;

  &::first-letter {
    text-transform: uppercase;
  }
`;

const focusRing = css`
  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
`;

const buttonBase = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: var(--radius);
  background: transparent;
  color: var(--ink-secondary);
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  transition:
    background 20ms ease-in,
    color 20ms ease-in,
    border-color 20ms ease-in;

  ${focusRing}

  &:hover:not(:disabled) {
    background: var(--hover);
    color: var(--ink);
  }

  &:active:not(:disabled) {
    background: var(--active);
  }

  &:disabled {
    cursor: default;
    color: var(--ink-faint);
  }
`;

/** The workhorse button. Default is a quiet ghost; `$variant="primary"` is the one loud control
 * a surface is allowed, and `$variant="outline"` sits between them for secondary-but-findable actions. */
export const DefaultButton = styled.button`
  ${buttonBase}

  ${(props) =>
    props.$variant === "primary" &&
    css`
      background: var(--accent);
      border-color: var(--accent);
      color: #ffffff;
      font-weight: 550;

      &:hover:not(:disabled) {
        background: var(--accent-dark);
        border-color: var(--accent-dark);
        color: #ffffff;
      }

      &:active:not(:disabled) {
        background: var(--accent-dark);
      }

      &:disabled {
        background: var(--gray-300);
        border-color: var(--gray-300);
        color: var(--paper);
      }
    `}

  ${(props) =>
    props.$variant === "outline" &&
    css`
      border-color: var(--border);
      color: var(--ink);
      box-shadow: var(--shadow-raised);

      &:hover:not(:disabled) {
        background: var(--hover);
      }
    `}

  ${(props) =>
    props.$variant === "danger" &&
    css`
      color: var(--tag-red-fg);

      &:hover:not(:disabled) {
        background: var(--tag-red-bg);
        color: var(--tag-red-fg);
      }
    `}
`;

export const Button = DefaultButton;

/** Square, icon-only variant of the ghost button. */
export const IconButton = styled.button`
  ${buttonBase}
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--ink-secondary);

  ${(props) =>
    props.$active &&
    css`
      background: var(--selected);
      color: var(--accent-dark);

      &:hover:not(:disabled) {
        background: var(--selected);
        color: var(--accent-dark);
      }
    `}

  svg {
    width: 16px;
    height: 16px;
    flex: 0 0 auto;
  }
`;

/** Section label. Deliberately sentence-case at a readable size rather than the tracked-out
 * 9px uppercase micro-label pattern, which turns a dense screen into noise. */
export const SectionLabel = styled.div`
  margin: 0;
  color: var(--ink-tertiary);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
`;

export const Divider = styled.div`
  height: 1px;
  margin: ${(props) => props.$gap || "20px"} 0;
  background: var(--hairline);
`;

export const inputBase = css`
  width: 100%;
  box-sizing: border-box;
  min-height: 32px;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: var(--radius);
  background: var(--gray-100);
  box-shadow: inset 0 0 0 1px var(--hairline);
  color: var(--ink);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.4;
  transition:
    box-shadow 20ms ease-in,
    background 20ms ease-in;

  &:hover:not(:focus) {
    background: var(--gray-200);
  }

  &:focus {
    outline: none;
    background: var(--paper);
    box-shadow:
      inset 0 0 0 1px var(--accent),
      0 0 0 2px var(--selected);
  }

  &:disabled {
    color: var(--ink-faint);
    cursor: default;
  }
`;

export const Input = styled.input`
  ${inputBase}
`;

export const TextArea = styled.textarea`
  ${inputBase}
  min-height: 64px;
  resize: vertical;
`;

export const Select = styled.select`
  ${inputBase}
  appearance: none;
  padding-right: 26px;
  cursor: pointer;
  background-image:
    linear-gradient(45deg, transparent 50%, var(--ink-tertiary) 50%), linear-gradient(135deg, var(--ink-tertiary) 50%, transparent 50%);
  background-position:
    calc(100% - 14px) calc(50% + 1px),
    calc(100% - 9px) calc(50% + 1px);
  background-size:
    5px 5px,
    5px 5px;
  background-repeat: no-repeat;
`;

/** Label stacked above its control. */
export const Field = styled.label`
  display: grid;
  gap: 4px;
  min-width: 0;
  color: var(--ink-secondary);
  font-size: 13px;
  font-weight: 500;
  opacity: ${(props) => (props.$disabled ? 0.5 : 1)};

  &[data-wide="true"] {
    grid-column: 1 / -1;
  }
`;

/** Notion-style page properties: a quiet label column beside its value, separated by nothing but
 * alignment. Replaces the bordered stat grids, which fenced every number into its own box. */
export const PropertyList = styled.dl`
  display: grid;
  gap: 2px;
  margin: 0;
`;

export const PropertyRow = styled.div`
  display: grid;
  grid-template-columns: minmax(120px, 152px) minmax(0, 1fr);
  gap: 12px;
  align-items: baseline;
  padding: 5px 8px;
  border-radius: var(--radius);
  transition: background 20ms ease-in;

  &:hover {
    background: var(--hover);
  }

  dt {
    color: var(--ink-tertiary);
    font-size: 14px;
  }

  dd {
    min-width: 0;
    margin: 0;
    color: var(--ink);
    font-size: 14px;
    overflow-wrap: anywhere;
  }
`;

export const Mono = styled.span`
  font-family: var(--font-mono);
  font-size: 13px;
`;

/** Quiet inline guidance. Not a callout box — an empty state should not look like a warning. */
export const Hint = styled.p`
  margin: 0;
  color: var(--ink-tertiary);
  font-size: 14px;
  line-height: 1.5;
`;

export const Modal = styled.dialog`
  width: 480px;
  max-width: calc(100vw - 32px);
  padding: 20px;
  border: none;
  border-radius: var(--radius-lg);
  background-color: var(--modal-bg);
  color: var(--ink);
  margin: 0;
  top: 88px;
  left: 50%;
  transform: translateX(-50%);
  max-height: calc(100vh - 176px);
  overflow-y: auto;
  overscroll-behavior: contain;
  box-shadow: var(--shadow-menu);

  &::backdrop {
    background: rgba(15, 15, 15, 0.3);
  }

  h1,
  h3 {
    margin: 0 0 10px;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .buttons {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 20px;
  }
`;
