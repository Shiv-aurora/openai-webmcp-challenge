import { useContext } from "preact/hooks";
import styled from "styled-components";
import { MystState } from "../mystState";
import { detectResearchDiffs } from "./researchDiff";
import { ensureProvenanceStore } from "./provenance";

const Rail = styled.nav`
  z-index: 9;
  display: flex;
  flex: 0 0 48px;
  flex-direction: column;
  align-items: center;
  width: 48px;
  min-width: 48px;
  padding: 7px 0;
  border-right: 1px solid var(--hairline);
  background: var(--sidebar-bg);
  box-sizing: border-box;

  @media print {
    display: none;
  }
`;

const RailButton = styled.button`
  position: relative;
  display: grid;
  width: 40px;
  height: 42px;
  margin: 1px 0;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: var(--radius);
  background: ${(props) => (props.$active ? "var(--selected)" : "transparent")};
  color: ${(props) => (props.$active ? "var(--ink)" : "var(--ink-tertiary)")};
  cursor: pointer;

  &::after {
    content: "";
    position: absolute;
    top: 8px;
    left: -4px;
    bottom: 8px;
    width: 2px;
    border-radius: 0 2px 2px 0;
    background: ${(props) => (props.$active ? "var(--accent)" : "transparent")};
  }

  &:hover {
    background: var(--hover);
    color: var(--ink);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  svg {
    width: 22px;
    height: 22px;
  }
`;

const Badge = styled.span`
  position: absolute;
  right: 2px;
  bottom: 2px;
  display: grid;
  min-width: 15px;
  height: 15px;
  padding: 0 3px;
  place-items: center;
  border: 2px solid var(--sidebar-bg);
  border-radius: 9px;
  background: var(--accent);
  color: white;
  box-sizing: border-box;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
`;

const XrayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
  </svg>
);

const SourceIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="6" cy="5" r="2.5" stroke="currentColor" stroke-width="1.7" />
    <circle cx="6" cy="19" r="2.5" stroke="currentColor" stroke-width="1.7" />
    <circle cx="18" cy="9" r="2.5" stroke="currentColor" stroke-width="1.7" />
    <path d="M6 7.5v9M8.5 16.5c5.8 0 1.9-7.5 7-7.5" stroke="currentColor" stroke-width="1.7" />
  </svg>
);

const DiffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M7 4v16M17 4v16M3.5 8.5h7M13.5 15.5h7" stroke="currentColor" stroke-width="1.7" />
    <path d="m8 6 2.5 2.5L8 11M16 13l-2.5 2.5L16 18" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
  </svg>
);

const VerifyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 3 5 6v5c0 4.5 2.8 8 7 10 4.2-2 7-5.5 7-10V6l-7-3Z" stroke="currentColor" stroke-width="1.7" />
    <path d="m8.5 12 2.2 2.2 4.8-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

export default function ResearchActivityBar() {
  const editorState = useContext(MystState);
  const provenance = ensureProvenanceStore(editorState);
  const data = provenance.data.value;
  const diffs = detectResearchDiffs(data);
  const activity = editorState.integrityExperience.value;

  const activate = (next) => {
    editorState.workspaceView.value = "paper";
    editorState.integrityExperience.value = next;
    editorState.integrityPanelOpen.value = true;
  };

  const items = [
    { id: "xray", label: "Research X-Ray", icon: XrayIcon, count: data.objects.length },
    { id: "github", label: "Source provenance", icon: SourceIcon },
    { id: "diff", label: "Research Diff", icon: DiffIcon, count: diffs.length },
    { id: "verify", label: "Verify claim", icon: VerifyIcon },
  ];

  return (
    <Rail aria-label="Research tools" data-testid="research-activity-bar">
      {items.map((item) => (
        <RailButton
          $active={activity === item.id && editorState.integrityPanelOpen.value}
          aria-label={item.label}
          aria-pressed={activity === item.id}
          data-testid={`activity-${item.id}`}
          key={item.id}
          title={item.label}
          type="button"
          onClick={() => activate(item.id)}
        >
          <item.icon />
          {item.count > 0 && <Badge>{item.count}</Badge>}
        </RailButton>
      ))}
    </Rail>
  );
}
