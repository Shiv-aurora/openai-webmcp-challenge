import { useContext, useEffect, useState } from "preact/hooks";
import styled from "styled-components";
import { buildDemoResearchProject } from "../demo/researchProject";
import { MystState } from "../mystState";
import { detectResearchDiffs, groupResearchDiffs } from "./researchDiff";
import { deriveManuscriptSelection } from "./selection";
import { EVIDENCE_TYPES, PROVENANCE_RELATIONS, VERIFICATION_STATES, ensureProvenanceStore } from "./provenance";
import { verifyQuantitativeClaim } from "./verification";
import { refreshXray, resolveXrayRange } from "./xray";
import { DefaultButton, Field, IconButton, Input, Select, Tag, TextArea, tagColors } from "../components/CommonUI";

const Panel = styled.aside`
  flex: 0 0 360px;
  width: 360px;
  min-width: 0;
  background: var(--panel-bg);
  overflow: auto;
  overscroll-behavior: contain;
  z-index: 8;

  @media (max-width: 1180px) {
    position: absolute;
    top: 12px;
    left: 60px;
    bottom: 12px;
    right: auto;
    margin-left: 0;
    max-width: calc(100% - 24px);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-menu);
  }

  @media (max-width: 680px) {
    right: 12px;
    width: auto;
    max-width: none;
  }

  @media print {
    display: none;
  }
`;

/** The panel header stays on the same light surface as the rest of the app. A dark bar here
 * would read as a separate product bolted onto the side of the editor. */
const PanelTop = styled.div`
  position: sticky;
  top: 0;
  z-index: 4;
  background: var(--panel-bg);
  border-bottom: 1px solid var(--hairline);
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 42px;
  padding: 6px 8px 6px 14px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 14px;
  line-height: 1.3;
  font-weight: 600;
  letter-spacing: -0.015em;
`;

const Section = styled.section`
  padding: 16px 14px;
  border-bottom: 1px solid var(--hairline);
  scroll-margin-top: 116px;

  &:last-child {
    border-bottom: 0;
  }
`;

const SectionHeading = styled.div`
  margin-bottom: 12px;
  color: var(--ink);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
`;

const XrayToggleButton = styled(DefaultButton)`
  width: 100%;
  height: 36px;
  background: ${(props) => (props.$active ? "var(--ink)" : "var(--accent)")};
  border-color: ${(props) => (props.$active ? "var(--ink)" : "var(--accent)")};
  color: #ffffff !important;
  font-weight: 600;

  &:hover:not(:disabled) {
    background: ${(props) => (props.$active ? "var(--ink-secondary)" : "var(--accent-dark)")};
    border-color: ${(props) => (props.$active ? "var(--ink-secondary)" : "var(--accent-dark)")};
    color: #ffffff !important;
  }
`;

const CoverageRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const CoverageValue = styled.strong`
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.025em;
`;

const Muted = styled.p`
  margin: 8px 0 0;
  color: var(--ink-tertiary);
  font-size: 13px;
  line-height: 1.5;

  strong {
    color: var(--ink-secondary);
  }
`;

const SourceHistory = styled.div`
  display: grid;
  margin-top: 18px;
  border-top: 1px solid var(--hairline);
`;

const SourceRun = styled.button`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 3px 10px;
  padding: 9px 4px;
  border: 0;
  border-bottom: 1px solid var(--hairline);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;

  &:hover {
    background: var(--hover);
  }

  strong {
    min-width: 0;
    overflow: hidden;
    font-size: 12px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  code {
    color: var(--ink-secondary);
    font-family: var(--font-mono);
    font-size: 11px;
  }

  span {
    grid-column: 1 / -1;
    color: var(--ink-faint);
    font-size: 11px;
  }
`;

const SelectionHeading = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
`;

const SelectionKind = styled.strong`
  font-size: 14px;
  font-weight: 600;
  text-transform: capitalize;
`;

const statusTone = (status) => tagColors(status).fg;

/** Quoted manuscript text. A soft wash reads as "lifted from the document" without the weight of
 * a bordered callout. */
const Snippet = styled.blockquote`
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--radius);
  background: var(--gray-100);
  color: var(--ink-secondary);
  font-size: 13px;
  line-height: 1.55;
  overflow-wrap: anywhere;
`;

const Meta = styled.dl`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 6px 12px;
  margin: 12px 0 0;
  font-size: 13px;

  dt {
    color: var(--ink-tertiary);
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
  color: var(--ink-tertiary);
  font-size: 13px;
  line-height: 1.55;
`;

const ObjectCard = styled.div`
  display: grid;
  gap: 12px;
`;

const ObjectTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
`;

const EvidenceList = styled.div`
  display: grid;
  gap: 0;
`;

const EvidenceCard = styled.div`
  padding: 14px 0;
  border-top: 1px solid var(--hairline);

  &:first-child {
    padding-top: 0;
    border-top: 0;
  }
`;

/** Verification and drift results are the one place a tinted surface is warranted: the outcome
 * is the content, so the color carries meaning rather than decorating a container. */
const VerificationCard = styled.div`
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: ${(props) => tagColors(props.$status).bg};
`;

const VerificationReason = styled.p`
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.5;
`;

const DiffGroup = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 16px;
`;

const DiffGroupTitle = styled.div`
  color: var(--ink-tertiary);
  font-size: 13px;
  font-weight: 500;
`;

const DiffCard = styled.div`
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border-left: 3px solid ${(props) => statusTone(props.$status === "rejected" ? "contradicted" : "stale")};
  background: var(--gray-100);
`;

const DiffChange = styled.div`
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--hairline);

  &:first-of-type {
    margin-top: 8px;
    padding-top: 0;
    border-top: 0;
  }
`;

const DiffLine = styled.div`
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  gap: 8px;
  margin-top: 5px;

  strong {
    color: var(--ink-faint);
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
  }

  span {
    min-width: 0;
    color: var(--ink-secondary);
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.45;
    overflow-wrap: break-word;
    word-break: normal;
  }
`;

const EvidenceTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  overflow-wrap: anywhere;
`;

const EvidenceMeta = styled.div`
  margin-top: 4px;
  color: var(--ink-tertiary);
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
`;

const DiffActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
`;

const EvidenceForm = styled.form`
  display: grid;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--hairline);
`;

/** X-Ray tallies. Each count carries its state color on the number itself, so the row scans as
 * a distribution without five colored chips competing for attention. */
const XraySummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
  margin-top: 16px;
`;

const XraySummaryItem = styled.div`
  min-width: 0;
  text-align: center;
`;

const XrayCount = styled.strong`
  display: block;
  color: ${(props) => statusTone(props.$status)};
  font-size: 18px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`;

const XrayLabel = styled.span`
  display: block;
  margin-top: 2px;
  color: var(--ink-tertiary);
  font-size: 11px;
  line-height: 1.2;
`;

const XrayList = styled.div`
  display: grid;
  gap: 2px;
  margin-top: 16px;
`;

const XrayItem = styled.button`
  display: grid;
  gap: 4px;
  width: 100%;
  padding: 7px 8px;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;

  &:hover {
    background: var(--hover);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
`;

const XrayItemTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
`;

const XraySnippet = styled.div`
  color: var(--ink-tertiary);
  font-size: 12px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CloseIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
  </svg>
);

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
  const experience = editorState.integrityExperience.value;
  const experienceTitle =
    {
      xray: "X-Ray",
      github: "Source",
      diff: "Diff",
      verify: "Verify",
    }[experience] || "Research";

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

  return (
    <Panel aria-label="Research tools" data-testid="integrity-panel">
      <PanelTop>
        <Header>
          <Title>{experienceTitle}</Title>
          <IconButton aria-label="Close research integrity panel" type="button" onClick={() => (integrityPanelOpen.value = false)}>
            <CloseIcon />
          </IconButton>
        </Header>
      </PanelTop>

      {experience === "xray" && (
        <Section data-experience="xray">
          <XrayToggleButton
            $active={xrayActive}
            aria-pressed={xrayActive}
            data-testid="toggle-xray"
            type="button"
            onClick={() => {
              const next = !provenance.xrayActive.peek();
              provenance.xrayActive.value = next;
              refreshXray(editorState.editorView.value, next, provenance.data.peek());
            }}
          >
            {xrayActive ? "Disable X-Ray" : "Enable X-Ray"}
          </XrayToggleButton>
          {!provenanceStats.objectCount && (
            <ButtonRow>
              <DefaultButton
                $variant="outline"
                data-testid="load-demo-research"
                type="button"
                onClick={() => provenance.replaceData(buildDemoResearchProject(text.text.value))}
              >
                Load demo
              </DefaultButton>
            </ButtonRow>
          )}
          <XraySummaryGrid data-testid="xray-summary">
            {xrayStatuses.map((status) => (
              <XraySummaryItem key={status}>
                <XrayCount $status={status} data-testid={`xray-count-${status}`}>
                  {stateCounts[status] || 0}
                </XrayCount>
                <XrayLabel>{status === "needs-review" ? "Review" : statusLabels[status]}</XrayLabel>
              </XraySummaryItem>
            ))}
          </XraySummaryGrid>
          {xrayObjects.length ? (
            <XrayList data-testid="xray-list">
              {xrayObjects.map((object) => (
                <XrayItem
                  aria-label={`Inspect ${objectLabel(object)} ${statusLabels[object.verificationState]}`}
                  data-testid="xray-item"
                  key={object.id}
                  type="button"
                  onClick={() => inspectXrayObject(object)}
                >
                  <XrayItemTop>
                    <span>{objectLabel(object)}</span>
                    <Tag $status={object.verificationState}>{statusLabels[object.verificationState]}</Tag>
                  </XrayItemTop>
                  <XraySnippet>{object.text}</XraySnippet>
                </XrayItem>
              ))}
            </XrayList>
          ) : (
            <EmptyState>No tracked objects.</EmptyState>
          )}
        </Section>
      )}

      {experience === "github" && (
        <Section data-experience="github">
          <CoverageRow>
            <CoverageValue data-testid="linked-object-count">{provenanceStats.linkedObjectCount} linked</CoverageValue>
            <Tag $status="tracked">{provenanceStats.objectCount} tracked</Tag>
          </CoverageRow>
          <SourceHistory aria-label="Recent revisions">
            {provenanceData.experiments
              .filter((run) => run.sourceCommit)
              .slice(-4)
              .reverse()
              .map((run) => (
                <SourceRun
                  key={run.id}
                  type="button"
                  onClick={() => {
                    editorState.activeExperimentId.value = run.id;
                    editorState.workspaceView.value = "experiments";
                    integrityPanelOpen.value = false;
                  }}
                >
                  <strong>{run.name}</strong>
                  <code>{run.sourceCommit}</code>
                  <span>
                    {run.status} · {run.artifacts.length} artifacts
                  </span>
                </SourceRun>
              ))}
          </SourceHistory>
        </Section>
      )}

      {experience === "verify" && (
        <>
          <Section>
            <SectionHeading>Current selection</SectionHeading>
            <SelectionHeading>
              <SelectionKind data-testid="selection-kind">{selectionKind}</SelectionKind>
              <Tag data-testid="selection-status" $status={selectionState}>
                {selectionStatus}
              </Tag>
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
                <div>
                  <ObjectTitle data-testid="tracked-object-kind">{objectLabel(activeObject)}</ObjectTitle>
                  <Muted>{activeObject.text}</Muted>
                </div>
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
                {!activeEvidence.length && <EmptyState>Add evidence before changing the verification state.</EmptyState>}
                <ButtonRow>
                  <DefaultButton
                    $variant="danger"
                    aria-label={`Remove tracked ${activeObject.kind}`}
                    type="button"
                    onClick={() => {
                      provenance.removeObject(activeObject.id);
                      resetEvidenceForm();
                    }}
                  >
                    Remove tracked object
                  </DefaultButton>
                </ButtonRow>
              </ObjectCard>
            ) : canTrack ? (
              <>
                <EmptyState>This {selectionKind.toLowerCase()} is not yet a durable provenance object.</EmptyState>
                <ButtonRow>
                  <DefaultButton
                    $variant="primary"
                    data-testid="create-provenance-object"
                    type="button"
                    onClick={() => provenance.createObject(selection, requestedKind)}
                  >
                    {selection.kind === "text" ? "Mark as claim" : `Track ${selectionKind.toLowerCase()}`}
                  </DefaultButton>
                </ButtonRow>
              </>
            ) : (
              <EmptyState>Select text, a claim, method, figure, or table to create a provenance-aware manuscript object.</EmptyState>
            )}
          </Section>

          <Section data-experience="verify">
            {selection.kind !== "claim" && activeObject?.kind !== "claim" ? (
              <EmptyState>Select a quantitative claim to run an evidence-backed deterministic check.</EmptyState>
            ) : (
              <>
                <DefaultButton $variant="primary" data-testid="verify-this" type="button" onClick={verifySelection}>
                  Verify This
                </DefaultButton>
                {activeVerification && (
                  <VerificationCard $status={activeVerification.verificationState} data-testid="verification-result">
                    <SelectionHeading>
                      <ObjectTitle>{prettyValue(activeVerification.outcome)}</ObjectTitle>
                      <Tag $status={activeVerification.verificationState}>{statusLabels[activeVerification.verificationState]}</Tag>
                    </SelectionHeading>
                    <VerificationReason data-testid="verification-reason">{activeVerification.reason}</VerificationReason>
                    <EvidenceMeta>
                      {activeVerification.evidenceReferences?.length || 0} evidence reference
                      {(activeVerification.evidenceReferences?.length || 0) === 1 ? "" : "s"} · checked{" "}
                      {new Date(activeVerification.checkedAt).toLocaleString()}
                    </EvidenceMeta>
                    {activeVerification.suggestedValue && (
                      <Muted>
                        Evidence-backed value: <strong>{activeVerification.suggestedValue.raw}</strong>. A manuscript correction must be proposed
                        through the visible review workflow and accepted by the researcher.
                      </Muted>
                    )}
                  </VerificationCard>
                )}
              </>
            )}
          </Section>
        </>
      )}

      {experience === "diff" && (
        <Section data-experience="diff">
          {researchDiffGroups.length ? (
            <div data-testid="research-diff-list">
              {researchDiffGroups.map((group) => (
                <DiffGroup key={group.title}>
                  <DiffGroupTitle>{group.title}</DiffGroupTitle>
                  {group.diffs.map((diff) => (
                    <DiffCard $status={diff.status} data-testid="research-diff-card" key={diff.id}>
                      <SelectionHeading>
                        <ObjectTitle>{diff.changes[0].label}</ObjectTitle>
                        <Tag $status={diff.status === "rejected" ? "contradicted" : "stale"}>{prettyValue(diff.status)}</Tag>
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
                        <DefaultButton $variant="outline" type="button" onClick={() => inspectResearchDiff(diff)}>
                          Inspect
                        </DefaultButton>
                        {diff.proposedText && diff.status !== "in-review" && (
                          <DefaultButton $variant="primary" data-testid="stage-research-diff" type="button" onClick={() => stageResearchDiff(diff)}>
                            Accept → review
                          </DefaultButton>
                        )}
                        <DefaultButton type="button" onClick={() => provenance.reviewResearchDiff(diff.id, "rejected")}>
                          Reject
                        </DefaultButton>
                        <DefaultButton type="button" onClick={() => provenance.reviewResearchDiff(diff.id, "deferred")}>
                          Defer
                        </DefaultButton>
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
      )}

      {experience === "verify" && (
        <Section>
          <SectionHeading>Evidence</SectionHeading>
          {!activeObject ? (
            <EmptyState>Create or select a tracked manuscript object before linking research evidence.</EmptyState>
          ) : (
            <>
              {activeEvidence.length ? (
                <EvidenceList data-testid="evidence-list">
                  {activeEvidence.map((entry) => {
                    const experiment = provenance.data.value.experiments.find((item) => item.id === entry.evidence.experimentId);
                    return (
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
                        {experiment && (
                          <Muted>
                            Run → <strong>{experiment.name}</strong> → evidence → {activeObject.kind}
                          </Muted>
                        )}
                        <ButtonRow>
                          {experiment && (
                            <DefaultButton
                              type="button"
                              onClick={() => {
                                editorState.activeExperimentId.value = experiment.id;
                                editorState.workspaceView.value = "experiments";
                              }}
                            >
                              Open run
                            </DefaultButton>
                          )}
                          <DefaultButton type="button" aria-label={`Edit evidence ${entry.evidence.label}`} onClick={() => editEvidence(entry)}>
                            Edit
                          </DefaultButton>
                          <DefaultButton
                            $variant="danger"
                            type="button"
                            aria-label={`Remove evidence ${entry.evidence.label}`}
                            onClick={() => {
                              provenance.removeEvidence(entry.evidence.id);
                              if (editing?.evidenceId === entry.evidence.id) resetEvidenceForm();
                            }}
                          >
                            Remove
                          </DefaultButton>
                        </ButtonRow>
                      </EvidenceCard>
                    );
                  })}
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
                  <DefaultButton $variant="primary" type="submit" data-testid="save-evidence">
                    {editing ? "Save evidence" : "Add evidence"}
                  </DefaultButton>
                  {editing && (
                    <DefaultButton type="button" onClick={resetEvidenceForm}>
                      Cancel
                    </DefaultButton>
                  )}
                </ButtonRow>
              </EvidenceForm>
            </>
          )}
        </Section>
      )}
    </Panel>
  );
}
