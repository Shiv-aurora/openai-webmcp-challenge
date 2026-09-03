import styled from "styled-components";

export const DefaultButton = styled.button`
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  border: 1px solid var(--border);
  background-color: var(--button-bg);
  height: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  transition:
    background-color 150ms ease,
    border-color 150ms ease,
    color 150ms ease,
    box-shadow 150ms ease;
  border-radius: var(--border-radius);

  &:hover:not(:disabled) {
    background-color: var(--button-bg-hover);
    border-color: var(--gray-300);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }

  &:not(:has(svg)) {
    padding: 0px 12px;
  }
`;

export const Modal = styled.dialog`
  width: 480px;
  max-width: 100vw;
  padding: 24px;
  background-color: var(--modal-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin: 0;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  max-height: calc(100vh - 160px);
  overflow-y: auto;
  scrollbar-width: thin;
  overscroll-behavior: contain;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);

  .buttons {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
  }
`;
