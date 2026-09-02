import { useContext } from "preact/hooks";
import styled from "styled-components";
import { MystState } from "../mystState";
import { manuscriptStats } from "./selection";

const Panel = styled.aside`
  flex: 0 0 318px;
  width: 318px;
  min-width: 0;
  margin-left: 16px;
  border: 1px solid var(--border);
  border-radius: calc(var(--border-radius) + 2px);
  background: var(--panel-bg);
  box-shadow: 0 10px 30px color-mix(in srgb, var(--box-shadow) 45%, transparent);
  overflow: auto;
  scrollbar-width: thin;
  z-index: 8;

  @media (max-width: 1180px) {
    position: absolute;
    top: 20px;
    right: 20px;
    bottom: 20px;
    margin-left: 0;
    max-width: calc(100% - 40px);
  }

  @media (max-width: 680px) {
    left: 20px;
    width: auto;
  }

  @media print {
    display: none;
  }
`;

const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--border);
`;

const Kicker = styled.div`
  margin-bottom: 5px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.62;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 18px;
  line-height: 1.25;
  font-weight: 700;
`;

const CloseButton = styled.button`
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background: var(--button-bg);
  color: inherit;
  cursor: pointer;
  font-size: 19px;
  line-height: 1;

  &:hover {
    background: var(--button-bg-hover);
  }
`;

const Section = styled.section`
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);

  &:last-child {
    border-bottom: 0;
  }
`;

const SectionHeading = styled.div`
  margin-bottom: 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.62;
`;

const CoverageRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
`;

const CoverageValue = styled.strong`
  font-size: 23px;
  line-height: 1;
`;

const Muted = styled.p`
  margin: 9px 0 0;
  font-size: 12px;
  line-height: 1.5;
  opacity: 0.68;
`;

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 16px;
`;

const Metric = styled.div`
  padding: 11px 12px;
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background: color-mix(in srgb, var(--editor-bg) 70%, transparent);
`;

const MetricValue = styled.div`
  font-size: 17px;
  font-weight: 700;
`;

const MetricLabel = styled.div`
  margin-top: 3px;
  font-size: 11px;
  opacity: 0.62;
`;

const SelectionHeading = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
`;

const SelectionKind = styled.strong`
  font-size: 15px;
  text-transform: capitalize;
`;

const Status = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 9px;
  border: 1px solid ${(props) => (props.$status === "unlinked" ? "var(--orange-500)" : "var(--border)")};
  border-radius: 999px;
  background: ${(props) => (props.$status === "unlinked" ? "color-mix(in srgb, var(--orange-500) 12%, transparent)" : "var(--editor-bg)")};
  color: ${(props) => (props.$status === "unlinked" ? "var(--orange-500)" : "inherit")};
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
`;

const Snippet = styled.blockquote`
  margin: 0;
  padding: 12px 13px;
  border-left: 3px solid var(--accent-dark);
  border-radius: 0 var(--border-radius) var(--border-radius) 0;
  background: var(--editor-bg);
  font-size: 12px;
  line-height: 1.55;
  overflow-wrap: anywhere;
`;

const Meta = styled.dl`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 7px 12px;
  margin: 14px 0 0;
  font-size: 11px;

  dt {
    opacity: 0.58;
  }

  dd {
    min-width: 0;
    margin: 0;
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const EmptyState = styled.div`
  padding: 13px;
  border: 1px dashed var(--border);
  border-radius: var(--border-radius);
  background: color-mix(in srgb, var(--editor-bg) 55%, transparent);
  font-size: 12px;
  line-height: 1.55;
`;

const kindLabels = {
  none: "No selection",
  text: "Text",
  claim: "Claim",
  method: "Method",
  figure: "Figure",
  table: "Table",
  section: "Section",
};

const statusLabels = {
  unlinked: "Unlinked",
  "context-only": "Context only",
};

export default function ResearchIntegrityPanel() {
  const { integrityPanelOpen, manuscriptSelection, text } = useContext(MystState);
  const selection = manuscriptSelection.value;
  const stats = manuscriptStats(text.text.value);
  const selectionKind = kindLabels[selection.kind] || "Text";
  const selectionStatus = statusLabels[selection.verificationState] || "Context only";

  return (
    <Panel aria-label="Research integrity" data-testid="integrity-panel">
      <Header>
        <div>
          <Kicker>Manuscript state</Kicker>
          <Title>Research integrity</Title>
        </div>
        <CloseButton aria-label="Close research integrity panel" type="button" onClick={() => (integrityPanelOpen.value = false)}>
          ×
        </CloseButton>
      </Header>

      <Section>
        <SectionHeading>Provenance coverage</SectionHeading>
        <CoverageRow>
          <CoverageValue>0 linked</CoverageValue>
          <Status $status="context-only">Not started</Status>
        </CoverageRow>
        <Muted>Integrity tracking begins when manuscript objects are connected to research evidence.</Muted>
        <MetricGrid>
          <Metric>
            <MetricValue data-testid="manuscript-section-count">{stats.sectionCount}</MetricValue>
            <MetricLabel>Sections</MetricLabel>
          </Metric>
          <Metric>
            <MetricValue data-testid="manuscript-word-count">{stats.wordCount}</MetricValue>
            <MetricLabel>Words</MetricLabel>
          </Metric>
        </MetricGrid>
      </Section>

      <Section>
        <SectionHeading>Current selection</SectionHeading>
        <SelectionHeading>
          <SelectionKind data-testid="selection-kind">{selectionKind}</SelectionKind>
          <Status data-testid="selection-status" $status={selection.verificationState}>
            {selectionStatus}
          </Status>
        </SelectionHeading>
        {selection.snippet ? (
          <>
            <Snippet data-testid="selection-snippet">{selection.snippet}</Snippet>
            <Meta>
              <dt>Section</dt>
              <dd>{selection.section?.title || "Front matter"}</dd>
              <dt>Line</dt>
              <dd>{selection.line}</dd>
              <dt>Range</dt>
              <dd>{selection.hasSelection ? "Explicit selection" : "Cursor context"}</dd>
            </Meta>
          </>
        ) : (
          <EmptyState data-testid="selection-snippet">
            Select a claim, method statement, table, figure, or section to inspect its manuscript context.
          </EmptyState>
        )}
      </Section>

      <Section>
        <SectionHeading>Evidence relationship</SectionHeading>
        <EmptyState>
          {selection.verificationState === "unlinked"
            ? `This ${selectionKind.toLowerCase()} is not linked to research evidence yet.`
            : "No provenance object is attached to the current context. Phase 2 will add explicit evidence links and review states."}
        </EmptyState>
      </Section>
    </Panel>
  );
}
