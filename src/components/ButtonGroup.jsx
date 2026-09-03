import { useEffect } from "preact/hooks";
import styled, { css } from "styled-components";
import { DefaultButton } from "./CommonUI";
import { useComputed } from "@preact/signals";

/** A segmented control: one soft track, with the selected segment lifted out of it as a raised
 * chip. Reads as a single control rather than five adjacent buttons. */
const GroupContainer = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: var(--radius-md);
  background: var(--gray-100);

  .btn-dropdown {
    right: 10px;
  }

  .dropdown-btns {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 190px;
  }
`;

const RadioButton = styled(DefaultButton)`
  width: 28px;
  height: 26px;
  padding: 0;
  border-radius: var(--radius-sm);
  color: var(--ink-tertiary);

  svg {
    width: 15px;
    height: 15px;
  }

  ${(props) =>
    props.$active &&
    css`
      background: var(--paper);
      box-shadow: var(--shadow-raised);
      color: var(--ink);

      &:hover:not(:disabled) {
        background: var(--paper);
        color: var(--ink);
      }
    `}

  &:hover ~ .btn-dropdown {
    display: block;
  }
`;

const DropdownButton = styled(DefaultButton)`
  gap: 10px;
  width: 100%;
  height: 30px;
  padding: 0 8px;
  justify-content: flex-start;
  color: var(--ink);
  font-weight: 400;

  svg {
    width: 16px;
    height: 16px;
    flex: 0 0 16px;
    color: var(--ink-tertiary);
  }

  ${(props) =>
    props.$active &&
    css`
      background: var(--selected);
      color: var(--accent-dark);

      svg {
        color: var(--accent-dark);
      }

      &:hover:not(:disabled) {
        background: var(--selected);
        color: var(--accent-dark);
      }
    `}
`;

const MoreIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
    <path d="M240-400q-33 0-56.5-23.5T160-480q0-33 23.5-56.5T240-560q33 0 56.5 23.5T320-480q0 33-23.5 56.5T240-400Zm240 0q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm240 0q-33 0-56.5-23.5T640-480q0-33 23.5-56.5T720-560q33 0 56.5 23.5T800-480q0 33-23.5 56.5T720-400Z" />
  </svg>
);

const ButtonGroup = ({ buttons, clickedId, mainButtonsNum = buttons.value.length, showOverflow = true }) => {
  useEffect(() => {
    buttons.value[clickedId].action();
  }, []);

  const mainButtons = useComputed(() => buttons.value.slice(0, mainButtonsNum));
  const dropdownButtons = useComputed(() => buttons.value.slice(mainButtonsNum));

  return (
    <GroupContainer>
      {mainButtons.value.map((button, i) => (
        <RadioButton
          className="icon radio-icon"
          type="button"
          disabled={button.disabled}
          key={button.id}
          name={button.id}
          onClick={() => button.action()}
          onMouseOver={() => button.hover?.()}
          title={button.tooltip}
          $active={i === clickedId}
        >
          {typeof button.icon == "function" ? <button.icon /> : <img src={button.icon} />}
        </RadioButton>
      ))}
      {showOverflow && dropdownButtons.value.length > 0 && (
        <div>
          <RadioButton className="icon radio-icon more" title="More views" type="button" $active={clickedId >= mainButtonsNum}>
            <MoreIcon />
          </RadioButton>
          <div className="btn-dropdown">
            <div className="dropdown-content">
              <div className="dropdown-btns">
                {dropdownButtons.value.map((button, i) => (
                  <DropdownButton
                    type="button"
                    disabled={button.disabled}
                    key={button.id}
                    name={button.id}
                    onClick={() => button.action()}
                    onMouseOver={() => button.hover?.()}
                    title={button.tooltip}
                    $active={i + mainButtonsNum === clickedId}
                  >
                    {typeof button.icon == "function" ? <button.icon /> : <img src={button.icon} />}
                    <span>{button.text}</span>
                  </DropdownButton>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </GroupContainer>
  );
};

export default ButtonGroup;
