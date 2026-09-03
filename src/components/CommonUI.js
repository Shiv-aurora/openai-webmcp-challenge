import styled from "styled-components";

export const DefaultButton = styled.button`
  cursor: pointer;
  font-size: 12px;
  font-weight: 650;
  font-family: inherit;
  border: 1px solid transparent;
  background-color: var(--button-bg);
  height: 36px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  transition:
    background-color 150ms ease,
    border-color 150ms ease,
    color 150ms ease;
  border-radius: var(--border-radius);

  &:focus-visible {
    outline: 2px solid var(--accent-dark);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: default;
  }

  &:not(:has(svg)) {
    padding: 0px 15px;
  }
`;

export const Modal = styled.dialog`
  width: 450px;
  max-width: 100vw;
  padding: 20px;
  background-color: var(--modal-bg);
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  margin: 0;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  max-height: calc(100vh - 160px);
  overflow-y: auto;
  scrollbar-width: thin;
  overscroll-behavior: contain;

  .buttons {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
  }
`;
