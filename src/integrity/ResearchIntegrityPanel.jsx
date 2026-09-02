import { useContext, useState } from "preact/hooks";
import styled from "styled-components";
import { MystState } from "../mystState";
import { manuscriptStats } from "./selection";
import { EVIDENCE_TYPES, PROVENANCE_RELATIONS, VERIFICATION_STATES, ensureProvenanceStore } from "./provenance";

const Panel = styled.aside`
  flex: 0 0 350px;
  width: 350px;
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

const statusTone = (status) => {
  if (status === "verified") return "var(--accent-dark)";
  if (status === "contradicted") return "var(--error-bg)";
  if (["unlinked", "needs-review", "stale"].includes(status)) return "var(--orange-500)";
  return "var(--border)";
};

const Status = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 9px;
  border: 1px solid ${(props) => statusTone(props.$status)};
  border-radius: 999px;
  background: color-mix(in srgb, ${(props) => statusTone(props.$status)} 10%, transparent);
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

const ObjectCard = styled.div`
  padding: 13px;
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background: var(--editor-bg);
`;

const ObjectTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
`;

const EvidenceList = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 12px;
`;

const EvidenceCard = styled.div`
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background: color-mix(in srgb, var(--editor-bg) 72%, transparent);
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

const ActionButton = styled.button`
  min-height: 32px;
  padding: 0 11px;
  border: 1px solid ${(props) => (props.$primary ? "var(--accent-dark)" : "var(--border)")};
  border-radius: var(--border-radius);
  background: ${(props) => (props.$primary ? "var(--accent-dark)" : "var(--button-bg)")};
  color: ${(props) => (props.$primary ? "white" : "inherit")};
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;

  &:hover {
    filter: brightness(0.97);
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
  const selectionKind = kindLabels[selection.kind] || "Text";
  const selectionState = activeObject?.verificationState || selection.verificationState;
  const selectionStatus = statusLabels[selectionState] || prettyValue(selectionState);
  const canTrack = Boolean(selection.snippet) && ["text", "claim", "method", "figure", "table"].includes(selection.kind);
  const requestedKind = selection.kind === "text" ? "claim" : selection.kind;

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
