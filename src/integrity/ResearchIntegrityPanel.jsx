import { useContext, useEffect, useState } from "preact/hooks";
import styled from "styled-components";
import { buildDemoResearchProject } from "../demo/researchProject";
import { MystState } from "../mystState";
import { detectResearchDiffs, groupResearchDiffs } from "./researchDiff";
import { deriveManuscriptSelection, manuscriptStats } from "./selection";
import { EVIDENCE_TYPES, PROVENANCE_RELATIONS, VERIFICATION_STATES, ensureProvenanceStore } from "./provenance";
import { verifyQuantitativeClaim } from "./verification";
import { refreshXray, resolveXrayRange } from "./xray";

const Panel = styled.aside`
  flex: 0 0 380px;
  width: 380px;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--panel-bg);
  box-shadow: 0 1px 2px var(--box-shadow);
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

const PanelTop = styled.div`
  position: sticky;
  top: 0;
  z-index: 4;
  background: var(--ink);
`;

const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 22px 18px;
  color: var(--paper);
`;

const Kicker = styled.div`
  margin-bottom: 5px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #89bdb0;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 19px;
  line-height: 1.25;
  font-weight: 720;
  letter-spacing: -0.02em;
`;

const PromiseLine = styled.p`
  max-width: 285px;
  margin: 8px 0 0;
  font-size: 11.5px;
  line-height: 1.5;
  color: color-mix(in srgb, var(--paper) 72%, transparent);
`;

const ExperienceNav = styled.nav`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  padding: 0 10px 10px;
  background: var(--ink);
`;

const ExperienceButton = styled.button`
  min-width: 0;
  min-height: 36px;
  border: 0;
  border-top: 1px solid color-mix(in srgb, var(--paper) 14%, transparent);
  border-radius: 0;
  background: transparent;
  color: color-mix(in srgb, var(--paper) 68%, transparent);
  cursor: pointer;
  font-size: 10px;
  font-weight: 680;
  letter-spacing: 0.02em;
  transition:
    color 140ms ease,
    background 140ms ease;

  & + & {
    border-left: 1px solid color-mix(in srgb, var(--paper) 12%, transparent);
  }

  &:hover,
  &:focus-visible {
    background: color-mix(in srgb, var(--paper) 8%, transparent);
    color: var(--paper);
  }
`;

const CloseButton = styled.button`
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--paper) 18%, transparent);
  border-radius: 7px;
  background: color-mix(in srgb, var(--paper) 6%, transparent);
  color: var(--paper);
  cursor: pointer;
  font-size: 19px;
  line-height: 1;

  &:hover {
    background: color-mix(in srgb, var(--paper) 12%, transparent);
  }
`;

const Section = styled.section`
  padding: 21px 22px;
  border-bottom: 1px solid var(--border);
  scroll-margin-top: 158px;

  &:last-child {
    border-bottom: 0;
  }
`;

const SectionHeading = styled.div`
  margin-bottom: 13px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--gray-700);
`;

const CoverageRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
`;

const CoverageValue = styled.strong`
  font-size: 26px;
  line-height: 1;
  letter-spacing: -0.035em;
`;

const Muted = styled.p`
  margin: 9px 0 0;
  font-size: 12px;
  line-height: 1.5;
  opacity: 0.68;
`;

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  margin-top: 16px;
  padding-top: 15px;
  border-top: 1px solid var(--border);
`;

const Metric = styled.div`
  min-width: 0;
  padding: 0 8px;
  border-left: 1px solid var(--border);

  &:first-child {
    padding-left: 0;
    border-left: 0;
  }
`;

const MetricValue = styled.div`
  font-size: 16px;
  font-weight: 700;
`;

const MetricLabel = styled.div`
  margin-top: 3px;
  font-size: 9px;
  line-height: 1.25;
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

const statusTone = (status) => {
  if (status === "verified") return "var(--accent-dark)";
  if (status === "contradicted") return "var(--error-bg)";
  if (["unlinked", "needs-review", "stale"].includes(status)) return "var(--orange-500)";
  return "var(--border)";
};

const Status = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 23px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: color-mix(in srgb, ${(props) => statusTone(props.$status)} 12%, transparent);
  color: ${(props) => statusTone(props.$status)};
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
`;

const Snippet = styled.blockquote`
  margin: 0;
  padding: 12px 13px;
  border-left: 2px solid var(--accent-dark);
  border-radius: 0;
  background: color-mix(in srgb, var(--accent-light) 35%, transparent);
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
  padding: 14px;
  border: 0;
  border-radius: 8px;
  background: var(--editor-bg);
  color: var(--gray-800);
  font-size: 12px;
  line-height: 1.55;
`;

const ObjectCard = styled.div`
  padding: 14px;
  border: 0;
  border-radius: 8px;
  background: var(--editor-bg);
`;

const ObjectTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
`;

const EvidenceList = styled.div`
  display: grid;
  gap: 0;
  margin-top: 12px;
`;

const EvidenceCard = styled.div`
  padding: 13px 0;
  border: 0;
  border-top: 1px solid var(--border);
  background: transparent;
`;

const VerificationCard = styled.div`
  padding: 14px;
  border: 1px solid ${(props) => statusTone(props.$status)};
  border-radius: 8px;
  background: color-mix(in srgb, ${(props) => statusTone(props.$status)} 8%, var(--editor-bg));
`;

const VerificationReason = styled.p`
  margin: 9px 0 0;
  font-size: 12px;
  line-height: 1.5;
`;

const DiffGroup = styled.div`
  display: grid;
  gap: 9px;
  margin-top: 14px;
`;

const DiffGroupTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
`;

const DiffCard = styled.div`
  padding: 14px 14px 14px 16px;
  border: 0;
  border-left: 3px solid ${(props) => statusTone(props.$status === "rejected" ? "contradicted" : "stale")};
  border-radius: 0 8px 8px 0;
  background: var(--editor-bg);
`;

const DiffChange = styled.div`
  padding-top: 9px;
  border-top: 1px solid var(--border);

  &:first-of-type {
    padding-top: 0;
    border-top: 0;
  }
`;

const DiffLine = styled.div`
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  gap: 8px;
  margin-top: 7px;
  font:
    10px/1.4 ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    monospace;

  strong {
    opacity: 0.62;
    white-space: nowrap;
  }

  span {
    min-width: 0;
    overflow-wrap: break-word;
    word-break: normal;
  }
`;

const EvidenceTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  overflow-wrap: anywhere;
`;

const EvidenceMeta = styled.div`
  margin-top: 5px;
  font-size: 10px;
  line-height: 1.45;
  opacity: 0.68;
  overflow-wrap: anywhere;
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`;

const DiffActions = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  gap: 6px;
  margin-top: 12px;

  button {
    min-width: 0;
    padding-inline: 8px;
    font-size: 10px;
  }
`;

const ActionButton = styled.button`
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid ${(props) => (props.$primary ? "var(--accent-dark)" : "var(--border)")};
  border-radius: 7px;
  background: ${(props) => (props.$primary ? "var(--ink)" : "transparent")};
  color: ${(props) => (props.$primary ? "white" : "inherit")};
  cursor: pointer;
  font-size: 11px;
  font-weight: 680;
  transition:
    background 140ms ease,
    border-color 140ms ease,
    transform 140ms ease;

  &:hover {
    background: ${(props) => (props.$primary ? "var(--accent-dark)" : "var(--button-bg-hover)")};
  }

  &:active {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-dark);
    outline-offset: 2px;
  }
`;

const Field = styled.label`
  display: grid;
  gap: 5px;
  font-size: 10px;
  font-weight: 700;
  opacity: ${(props) => (props.$disabled ? 0.55 : 1)};
`;

const Input = styled.input`
  width: 100%;
  min-height: 34px;
  padding: 7px 9px;
  box-sizing: border-box;
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background: var(--editor-bg);
  color: inherit;
  font: inherit;
`;

const Select = styled.select`
  width: 100%;
  min-height: 34px;
  padding: 7px 9px;
  box-sizing: border-box;
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background: var(--editor-bg);
  color: inherit;
  font: inherit;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 62px;
  padding: 7px 9px;
  box-sizing: border-box;
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background: var(--editor-bg);
  color: inherit;
  resize: vertical;
  font: inherit;
`;

const EvidenceForm = styled.form`
  display: grid;
  gap: 10px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
`;

const XraySummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
  margin-top: 14px;
`;

const XraySummaryItem = styled.div`
  min-width: 0;
  padding: 9px 5px;
  border: 0;
  border-top: 2px solid ${(props) => statusTone(props.$status)};
  border-radius: 0;
  background: transparent;
  text-align: center;
`;

const XrayCount = styled.strong`
  display: block;
  font-size: 17px;
`;

const XrayLabel = styled.span`
  display: block;
  margin-top: 3px;
  font-size: 9px;
  line-height: 1.2;
  text-transform: uppercase;
  opacity: 0.72;
`;

const XrayList = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 14px;
`;

const XrayItem = styled.button`
  width: 100%;
  padding: 10px 11px;
  border: 0;
  border-left: 3px solid ${(props) => statusTone(props.$status)};
  border-radius: 0 7px 7px 0;
  background: var(--editor-bg);
  color: inherit;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: var(--button-bg-hover);
  }
`;

const XrayItemTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
`;

const XraySnippet = styled.div`
  margin-top: 5px;
  font-size: 10px;
  line-height: 1.35;
  opacity: 0.72;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  "needs-review": "Needs review",
  verified: "Verified",
  stale: "Stale",
  contradicted: "Contradicted",
};

const xrayStatuses = ["verified", "needs-review", "stale", "contradicted", "unlinked"];

const prettyValue = (value) => value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const emptyEvidenceForm = () => ({
  type: "experiment-result",
  label: "",
  artifactId: "",
  experimentId: "",
  commit: "",
  metric: "",
  uri: "",
  relation: "supports",
  notes: "",
});

const objectLabel = (object) => {
  if (!object) return "";
  if (object.subtype === "quantitative-result") return "Quantitative claim";
  return kindLabels[object.kind] || prettyValue(object.kind);
};

export default function ResearchIntegrityPanel() {
  const editorState = useContext(MystState);
  const { integrityPanelOpen, manuscriptSelection, text } = editorState;
  const provenance = ensureProvenanceStore(editorState);
  const [evidenceForm, setEvidenceForm] = useState(emptyEvidenceForm());
  const [editing, setEditing] = useState(null);

  const selection = manuscriptSelection.value;
  const stats = manuscriptStats(text.text.value);
  const provenanceStats = provenance.stats();
  const activeObject = provenance.findObjectForSelection(selection);
  const activeEvidence = activeObject ? provenance.evidenceForObject(activeObject.id) : [];
  const activeVerification = activeObject?.verification || null;
  const selectionKind = kindLabels[selection.kind] || "Text";
  const selectionState = activeObject?.verificationState || selection.verificationState;
  const selectionStatus = statusLabels[selectionState] || prettyValue(selectionState);
  const canTrack = Boolean(selection.snippet) && ["text", "claim", "method", "figure", "table"].includes(selection.kind);
  const requestedKind = selection.kind === "text" ? "claim" : selection.kind;
  const xrayActive = provenance.xrayActive.value;
  const xrayObjects = provenance.data.value.objects;
  const stateCounts = provenanceStats.stateCounts;
  const provenanceData = provenance.data.value;
  const researchDiffGroups = groupResearchDiffs(detectResearchDiffs(provenanceData));

  useEffect(() => {
    const markdown = text.text.value;
    const reviewDiffs = detectResearchDiffs(provenanceData).filter((item) => item.status === "in-review" && item.proposedText);
    for (const diff of reviewDiffs) {
      const object = provenance.data.peek().objects.find((item) => item.id === diff.objectId);
      const from = markdown.indexOf(diff.proposedText, Math.max(0, (object?.anchor?.from || 0) - 100));
      if (from < 0 || Math.abs(from - (object?.anchor?.from || 0)) > 300) continue;
      if (markdown.lastIndexOf("{~~", from) > markdown.lastIndexOf("~~}", from)) continue;
      provenance.reconcileResearchDiff(
        diff.id,
        diff.objectId,
        diff.proposedText,
        {
          from,
          to: from + diff.proposedText.length,
          line: markdown.slice(0, from).split("\n").length,
        },
        diff.evidenceReferences,
      );
    }
  }, [provenance, provenanceData, text.text.value]);

  const resetEvidenceForm = () => {
    setEvidenceForm(emptyEvidenceForm());
    setEditing(null);
  };

  const updateField = (field, value) => setEvidenceForm((current) => ({ ...current, [field]: value }));

  const submitEvidence = (event) => {
    event.preventDefault();
    if (!activeObject || !evidenceForm.label.trim()) return;

    if (editing) {
      provenance.updateEvidence(editing.evidenceId, {
        type: evidenceForm.type,
        label: evidenceForm.label,
        artifactId: evidenceForm.artifactId,
        experimentId: evidenceForm.experimentId,
        commit: evidenceForm.commit,
        metric: evidenceForm.metric,
        uri: evidenceForm.uri,
        notes: evidenceForm.notes,
      });
      provenance.updateLink(editing.linkId, { relation: evidenceForm.relation });
    } else {
      provenance.addEvidence(activeObject.id, evidenceForm);
    }
    resetEvidenceForm();
  };

  const editEvidence = ({ evidence, link }) => {
    setEditing({ evidenceId: evidence.id, linkId: link.id });
    setEvidenceForm({
      type: evidence.type,
      label: evidence.label,
      artifactId: evidence.artifactId,
      experimentId: evidence.experimentId,
      commit: evidence.commit,
      metric: evidence.metric,
      uri: evidence.uri,
      relation: link.relation,
      notes: evidence.notes,
    });
  };

  const inspectXrayObject = (object) => {
    const view = editorState.editorView.value;
    if (!view) return;
    const range = resolveXrayRange(view.state.doc, object);
    if (!range) return;
    view.dispatch({ selection: { anchor: range.from, head: range.to }, scrollIntoView: true });
    view.focus();
  };

  const verifySelection = () => {
    let object = activeObject;
    if (!object && selection.kind === "claim" && selection.snippet) object = provenance.createObject(selection, "claim");
    if (!object) return;
    const verification = verifyQuantitativeClaim(object, provenance.evidenceForObject(object.id));
    provenance.recordVerification(object.id, verification);
  };

  const inspectResearchDiff = (diff) => {
    const object = provenance.data.peek().objects.find((item) => item.id === diff.objectId);
    if (object) inspectXrayObject(object);
  };

  const stageResearchDiff = (diff) => {
    if (!diff.proposedText) return;
    const view = editorState.editorView.value;
    const object = provenance.data.peek().objects.find((item) => item.id === diff.objectId);
    const range = resolveXrayRange(view?.state.doc, object);
    if (!view || !range || view.state.sliceDoc(range.from, range.to) !== object.text || /\{(?:~~|\+\+|--)/.test(diff.proposedText)) return;
    const markup = `{~~${object.text}~>${diff.proposedText}~~}`;
    view.dispatch({
      changes: { from: range.from, to: range.to, insert: markup },
      selection: { anchor: range.from, head: range.from + markup.length },
      scrollIntoView: true,
    });
    editorState.manuscriptSelection.value = deriveManuscriptSelection(view.state);
    provenance.reviewResearchDiff(diff.id, "in-review", { reviewRequired: true });
  };

  const navigateExperience = (event, experience) => {
    event.currentTarget.closest("aside")?.querySelector(`[data-experience="${experience}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Panel aria-label="Research integrity" data-testid="integrity-panel">
      <PanelTop>
        <Header>
          <div>
            <Kicker>{xrayActive ? "Global integrity map" : "Live provenance"}</Kicker>
            <Title>{xrayActive ? "Research X-Ray" : "Research integrity"}</Title>
            <PromiseLine>Every claim in your paper stays connected to the research that produced it.</PromiseLine>
          </div>
          <CloseButton aria-label="Close research integrity panel" type="button" onClick={() => (integrityPanelOpen.value = false)}>
            ×
          </CloseButton>
        </Header>

        <ExperienceNav aria-label="Integrity workflows">
          <ExperienceButton type="button" onClick={(event) => navigateExperience(event, "xray")}>
            Research X-Ray
          </ExperienceButton>
          <ExperienceButton type="button" onClick={(event) => navigateExperience(event, "verify")}>
            Verify This
          </ExperienceButton>
          <ExperienceButton type="button" onClick={(event) => navigateExperience(event, "diff")}>
            Research Diff
          </ExperienceButton>
        </ExperienceNav>
      </PanelTop>

      <Section data-experience="xray">
        <SectionHeading>Research X-Ray</SectionHeading>
        <ActionButton
          $primary={!xrayActive}
          aria-pressed={xrayActive}
          data-testid="toggle-xray"
          type="button"
          onClick={() => {
            const next = !provenance.xrayActive.peek();
            provenance.xrayActive.value = next;
            refreshXray(editorState.editorView.value, next, provenance.data.peek().objects);
          }}
        >
          {xrayActive ? "Exit X-Ray" : "Enter X-Ray"}
        </ActionButton>
        <Muted>
          {xrayActive
            ? "The manuscript is showing provenance health directly on every tracked research object."
            : "Turn the manuscript into a visual integrity map without changing its content."}
        </Muted>
        {!provenanceStats.objectCount && (
          <ButtonRow>
            <ActionButton
              $primary
              data-testid="load-demo-research"
              type="button"
              onClick={() => provenance.replaceData(buildDemoResearchProject(text.text.value))}
            >
              Start the deterministic demo
            </ActionButton>
          </ButtonRow>
        )}
        {xrayActive && (
          <>
            <XraySummaryGrid data-testid="xray-summary">
              {xrayStatuses.map((status) => (
                <XraySummaryItem $status={status} key={status}>
                  <XrayCount data-testid={`xray-count-${status}`}>{stateCounts[status] || 0}</XrayCount>
                  <XrayLabel>{status === "needs-review" ? "Review" : statusLabels[status]}</XrayLabel>
                </XraySummaryItem>
              ))}
            </XraySummaryGrid>
            {xrayObjects.length ? (
              <XrayList data-testid="xray-list">
                {xrayObjects.map((object) => (
                  <XrayItem
                    $status={object.verificationState}
                    aria-label={`Inspect ${objectLabel(object)} ${statusLabels[object.verificationState]}`}
                    data-testid="xray-item"
                    key={object.id}
                    type="button"
                    onClick={() => inspectXrayObject(object)}
                  >
                    <XrayItemTop>
                      <span>{objectLabel(object)}</span>
                      <Status $status={object.verificationState}>{statusLabels[object.verificationState]}</Status>
                    </XrayItemTop>
                    <XraySnippet>{object.text}</XraySnippet>
                  </XrayItem>
                ))}
              </XrayList>
            ) : (
              <EmptyState>No tracked manuscript objects yet. Track a claim, method, figure, or table to populate X-Ray.</EmptyState>
            )}
          </>
        )}
      </Section>

      <Section>
        <SectionHeading>Provenance coverage</SectionHeading>
        <CoverageRow>
          <CoverageValue data-testid="linked-object-count">{provenanceStats.linkedObjectCount} linked</CoverageValue>
          <Status $status={provenanceStats.objectCount ? "needs-review" : "context-only"}>{provenanceStats.objectCount} tracked</Status>
        </CoverageRow>
        <Muted>Tracked manuscript objects remain connected to their evidence metadata across browser reloads.</Muted>
        <MetricGrid>
          <Metric>
            <MetricValue data-testid="manuscript-section-count">{stats.sectionCount}</MetricValue>
            <MetricLabel>Sections</MetricLabel>
          </Metric>
          <Metric>
            <MetricValue data-testid="manuscript-word-count">{stats.wordCount}</MetricValue>
            <MetricLabel>Words</MetricLabel>
          </Metric>
          <Metric>
            <MetricValue data-testid="provenance-object-count">{provenanceStats.objectCount}</MetricValue>
            <MetricLabel>Tracked objects</MetricLabel>
          </Metric>
          <Metric>
            <MetricValue data-testid="evidence-count">{provenanceStats.evidenceCount}</MetricValue>
            <MetricLabel>Evidence items</MetricLabel>
          </Metric>
        </MetricGrid>
      </Section>

      <Section>
        <SectionHeading>Current selection</SectionHeading>
        <SelectionHeading>
          <SelectionKind data-testid="selection-kind">{selectionKind}</SelectionKind>
          <Status data-testid="selection-status" $status={selectionState}>
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
        <SectionHeading>Provenance object</SectionHeading>
        {activeObject ? (
          <ObjectCard data-testid="provenance-object">
            <ObjectTitle data-testid="tracked-object-kind">{objectLabel(activeObject)}</ObjectTitle>
            <Muted>{activeObject.text}</Muted>
            <Field $disabled={!activeEvidence.length}>
              Verification state
              <Select
                aria-label="Verification state"
                data-testid="verification-state"
                disabled={!activeEvidence.length}
                value={activeObject.verificationState}
                onChange={(event) => provenance.updateObject(activeObject.id, { verificationState: event.currentTarget.value })}
              >
                {VERIFICATION_STATES.map((status) => (
                  <option value={status} key={status}>
                    {statusLabels[status] || prettyValue(status)}
                  </option>
                ))}
              </Select>
            </Field>
            {!activeEvidence.length && <Muted>Add evidence before changing the verification state.</Muted>}
            <ButtonRow>
              <ActionButton
                aria-label={`Remove tracked ${activeObject.kind}`}
                type="button"
                onClick={() => {
                  provenance.removeObject(activeObject.id);
                  resetEvidenceForm();
                }}
              >
                Remove tracked object
              </ActionButton>
            </ButtonRow>
          </ObjectCard>
        ) : canTrack ? (
          <>
            <EmptyState>This {selectionKind.toLowerCase()} is not yet a durable provenance object.</EmptyState>
            <ButtonRow>
              <ActionButton
                $primary
                data-testid="create-provenance-object"
                type="button"
                onClick={() => provenance.createObject(selection, requestedKind)}
              >
                {selection.kind === "text" ? "Mark as claim" : `Track ${selectionKind.toLowerCase()}`}
              </ActionButton>
            </ButtonRow>
          </>
        ) : (
          <EmptyState>Select text, a claim, method, figure, or table to create a provenance-aware manuscript object.</EmptyState>
        )}
      </Section>

      <Section data-experience="verify">
        <SectionHeading>Verify This</SectionHeading>
        {selection.kind !== "claim" && activeObject?.kind !== "claim" ? (
          <EmptyState>Select a quantitative claim to run an evidence-backed deterministic check.</EmptyState>
        ) : (
          <>
            <ActionButton $primary data-testid="verify-this" type="button" onClick={verifySelection}>
              Verify This
            </ActionButton>
            <Muted>Compares one unambiguous manuscript value with linked evidence. It never reruns experiments or guesses missing metrics.</Muted>
            {activeVerification && (
              <VerificationCard $status={activeVerification.verificationState} data-testid="verification-result">
                <SelectionHeading>
                  <ObjectTitle>{prettyValue(activeVerification.outcome)}</ObjectTitle>
                  <Status $status={activeVerification.verificationState}>{statusLabels[activeVerification.verificationState]}</Status>
                </SelectionHeading>
                <VerificationReason data-testid="verification-reason">{activeVerification.reason}</VerificationReason>
                <EvidenceMeta>
                  {activeVerification.evidenceReferences?.length || 0} evidence reference
                  {(activeVerification.evidenceReferences?.length || 0) === 1 ? "" : "s"} · checked{" "}
                  {new Date(activeVerification.checkedAt).toLocaleString()}
                </EvidenceMeta>
                {activeVerification.suggestedValue && (
                  <Muted>
                    Evidence-backed value: <strong>{activeVerification.suggestedValue.raw}</strong>. A manuscript correction must be proposed through
                    the visible review workflow and accepted by the researcher.
                  </Muted>
                )}
              </VerificationCard>
            )}
          </>
        )}
      </Section>

      <Section data-experience="diff">
        <SectionHeading>Research Diff</SectionHeading>
        <Muted>Live drift between manuscript objects and their linked research evidence, grouped by manuscript section.</Muted>
        {researchDiffGroups.length ? (
          <div data-testid="research-diff-list">
            {researchDiffGroups.map((group) => (
              <DiffGroup key={group.title}>
                <DiffGroupTitle>{group.title}</DiffGroupTitle>
                {group.diffs.map((diff) => (
                  <DiffCard $status={diff.status} data-testid="research-diff-card" key={diff.id}>
                    <SelectionHeading>
                      <ObjectTitle>{diff.changes[0].label}</ObjectTitle>
                      <Status $status={diff.status === "rejected" ? "contradicted" : "stale"}>{prettyValue(diff.status)}</Status>
                    </SelectionHeading>
                    {diff.changes.map((change, index) => (
                      <DiffChange key={`${change.kind}-${index}`}>
                        <DiffLine>
                          <strong>Paper</strong>
                          <span>{change.before || "—"}</span>
                        </DiffLine>
                        <DiffLine>
                          <strong>Research</strong>
                          <span>{change.after || "—"}</span>
                        </DiffLine>
                      </DiffChange>
                    ))}
                    <DiffActions>
                      <ActionButton type="button" onClick={() => inspectResearchDiff(diff)}>
                        Inspect
                      </ActionButton>
                      {diff.proposedText && diff.status !== "in-review" && (
                        <ActionButton $primary data-testid="stage-research-diff" type="button" onClick={() => stageResearchDiff(diff)}>
                          Accept → review
                        </ActionButton>
                      )}
                      <ActionButton type="button" onClick={() => provenance.reviewResearchDiff(diff.id, "rejected")}>
                        Reject
                      </ActionButton>
                      <ActionButton type="button" onClick={() => provenance.reviewResearchDiff(diff.id, "deferred")}>
                        Defer
                      </ActionButton>
                    </DiffActions>
                    {diff.status === "in-review" && (
                      <Muted>Update staged in the manuscript. Use the visible accept/reject suggestion controls.</Muted>
                    )}
                  </DiffCard>
                ))}
              </DiffGroup>
            ))}
          </div>
        ) : (
          <EmptyState data-testid="research-diff-empty">No evidence-driven manuscript drift is currently detected.</EmptyState>
        )}
      </Section>

      <Section>
        <SectionHeading>Evidence relationship</SectionHeading>
        {!activeObject ? (
          <EmptyState>Create or select a tracked manuscript object before linking research evidence.</EmptyState>
        ) : (
          <>
            {activeEvidence.length ? (
              <EvidenceList data-testid="evidence-list">
                {activeEvidence.map((entry) => (
                  <EvidenceCard key={entry.evidence.id} data-testid="evidence-card">
                    <EvidenceTitle>{entry.evidence.label}</EvidenceTitle>
                    <EvidenceMeta>
                      {prettyValue(entry.evidence.type)} · {prettyValue(entry.link.relation)}
                      {entry.evidence.experimentId ? ` · experiment ${entry.evidence.experimentId}` : ""}
                      {entry.evidence.metric ? ` · metric ${entry.evidence.metric}` : ""}
                      {entry.evidence.commit ? ` · commit ${entry.evidence.commit}` : ""}
                      {entry.evidence.artifactId ? ` · artifact ${entry.evidence.artifactId}` : ""}
                    </EvidenceMeta>
                    {entry.evidence.notes && <Muted>{entry.evidence.notes}</Muted>}
                    <ButtonRow>
                      <ActionButton type="button" aria-label={`Edit evidence ${entry.evidence.label}`} onClick={() => editEvidence(entry)}>
                        Edit
                      </ActionButton>
                      <ActionButton
                        type="button"
                        aria-label={`Remove evidence ${entry.evidence.label}`}
                        onClick={() => {
                          provenance.removeEvidence(entry.evidence.id);
                          if (editing?.evidenceId === entry.evidence.id) resetEvidenceForm();
                        }}
                      >
                        Remove
                      </ActionButton>
                    </ButtonRow>
                  </EvidenceCard>
                ))}
              </EvidenceList>
            ) : (
              <EmptyState>No research evidence is linked to this tracked object yet.</EmptyState>
            )}

            <EvidenceForm onSubmit={submitEvidence} data-testid="evidence-form">
              <Field>
                Evidence type
                <Select data-testid="evidence-type" value={evidenceForm.type} onChange={(event) => updateField("type", event.currentTarget.value)}>
                  {EVIDENCE_TYPES.map((type) => (
                    <option value={type} key={type}>
                      {prettyValue(type)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                Source / artifact
                <Input
                  data-testid="evidence-label"
                  required
                  value={evidenceForm.label}
                  placeholder="results/stress_eval.json"
                  onInput={(event) => updateField("label", event.currentTarget.value)}
                />
              </Field>
              <Field>
                Artifact identity
                <Input
                  data-testid="evidence-artifact-id"
                  value={evidenceForm.artifactId}
                  placeholder="stress-eval-v7"
                  onInput={(event) => updateField("artifactId", event.currentTarget.value)}
                />
              </Field>
              <Field>
                Experiment identity
                <Input
                  data-testid="evidence-experiment-id"
                  value={evidenceForm.experimentId}
                  placeholder="run-2026-09-02"
                  onInput={(event) => updateField("experimentId", event.currentTarget.value)}
                />
              </Field>
              <Field>
                Commit
                <Input
                  data-testid="evidence-commit"
                  value={evidenceForm.commit}
                  placeholder="a1b2c3d"
                  onInput={(event) => updateField("commit", event.currentTarget.value)}
                />
              </Field>
              <Field>
                Metric
                <Input
                  data-testid="evidence-metric"
                  value={evidenceForm.metric}
                  placeholder="stress_accuracy_improvement=18.2%"
                  onInput={(event) => updateField("metric", event.currentTarget.value)}
                />
              </Field>
              <Field>
                Relationship
                <Select
                  data-testid="evidence-relation"
                  value={evidenceForm.relation}
                  onChange={(event) => updateField("relation", event.currentTarget.value)}
                >
                  {PROVENANCE_RELATIONS.map((relation) => (
                    <option value={relation} key={relation}>
                      {prettyValue(relation)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                URI or repository path
                <Input
                  data-testid="evidence-uri"
                  value={evidenceForm.uri}
                  placeholder="experiments/stress/results.json"
                  onInput={(event) => updateField("uri", event.currentTarget.value)}
                />
              </Field>
              <Field>
                Notes
                <TextArea
                  data-testid="evidence-notes"
                  value={evidenceForm.notes}
                  placeholder="Optional provenance note"
                  onInput={(event) => updateField("notes", event.currentTarget.value)}
                />
              </Field>
              <ButtonRow>
                <ActionButton $primary type="submit" data-testid="save-evidence">
                  {editing ? "Save evidence" : "Add evidence"}
                </ActionButton>
                {editing && (
                  <ActionButton type="button" onClick={resetEvidenceForm}>
                    Cancel
                  </ActionButton>
                )}
              </ButtonRow>
            </EvidenceForm>
          </>
        )}
      </Section>
    </Panel>
  );
}
