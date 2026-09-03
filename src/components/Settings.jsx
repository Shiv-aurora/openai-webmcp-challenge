import { useContext } from "preact/hooks";
import styled from "styled-components";
import { MystState } from "../mystState";
import { Compartment } from "@codemirror/state";
import { useSignalEffect } from "@preact/signals";

const SettingsList = styled.div`
  width: 264px;

  h1 {
    margin: 0 0 4px;
    padding: 0 8px;
    color: var(--ink-tertiary);
    font-size: 13px;
    font-weight: 500;
  }

  ul {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    max-height: 400px;
    overflow-y: auto;
    margin: 0;
  }

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 32px;
    padding: 2px 8px;
    border-radius: var(--radius);

    &:hover {
      background: var(--hover);
    }
  }

  p {
    margin: 0;
    font-size: 14px;
  }
`;

/** Compact switch sized to a menu row: a 32×18 track reads as a setting toggle rather than a
 * standalone control. */
const ToggleContainer = styled.span`
  flex: 0 0 auto;

  input {
    display: none;
  }

  label {
    display: block;
    width: 32px;
    height: 18px;
    border-radius: 9px;
    transition: background-color 160ms ease;
    cursor: pointer;
    position: relative;
    background-color: var(--switch-bg);

    &::before {
      content: "";
      position: absolute;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background-color: white;
      box-shadow: 0 1px 2px rgba(15, 15, 15, 0.2);
      left: 2px;
      top: 2px;
      transition: transform 160ms ease;
    }
  }

  input:checked + label {
    background-color: var(--switch-active-bg);

    &::before {
      transform: translateX(14px);
    }
  }

  input:focus-visible + label {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

const Toggle = ({ ...props }) => {
  return (
    <ToggleContainer>
      <input type="checkbox" {...props} />
      <label htmlFor={props.id} title="Toggle setting" />
    </ToggleContainer>
  );
};

export const userExtensionsCompartment = new Compartment();

const Settings = () => {
  const { userSettings } = useContext(MystState);

  function changeSetting(id, enabled) {
    userSettings.value = userSettings.value.map((s) => (s.id == id ? { ...s, enabled } : s));
  }

  useSignalEffect(() => {
    localStorage.setItem("myst/settings", JSON.stringify(userSettings.value.map((s) => ({ id: s.id, enabled: s.enabled }))));
  });

  return (
    <SettingsList>
      <h1>Settings</h1>
      <ul>
        {userSettings.value.map((s) => (
          <li key={s.id}>
            <p>{s.title}</p>
            <Toggle name={s.id} id={s.id} checked={s.enabled} onChange={(ev) => changeSetting(s.id, ev.target.checked)} />
          </li>
        ))}
      </ul>
    </SettingsList>
  );
};

export default Settings;
