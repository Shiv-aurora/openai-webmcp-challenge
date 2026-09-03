import { useContext, useMemo, useState } from "preact/hooks";
import { styled } from "styled-components";
import { MystState } from "../mystState";
import { ensureProvenanceStore, EXPERIMENT_STATUSES } from "../integrity/provenance";
import { buildDemoResearchProject } from "../demo/researchProject";

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100% - 56px);
  min-height: 0;
  background: var(--canvas);
`;

const Lifecycle = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 52px;
  padding: 0 20px;
  border-bottom: 1px solid var(--border);
  background: var(--paper);
  box-sizing: border-box;
`;

const Promise = styled.div`
  min-width: 0;

  strong {
    display: block;
    font-size: 12px;
    font-weight: 650;
    color: var(--ink);
  }

  span {
    display: block;
    margin-top: 1px;
    color: var(--gray-600);
    font-size: 10px;
  }

  @media (max-width: 900px) {
    display: none;
  }
`;

const LifecycleSteps = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`;

const Step = styled.button`
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 0 10px;
  border: 0;
  border-radius: 5px;
  background: ${(props) => (props.$active ? "var(--accent-light)" : "transparent")};
  color: ${(props) => (props.$active ? "var(--accent-dark)" : "var(--gray-700)")};
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: ${(props) => (props.$active ? 650 : 500)};

  &:hover {
    background: var(--button-bg-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

const Count = styled.span`
  display: grid;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  place-items: center;
  border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 9px;
`;

const Arrow = styled.span`
  color: var(--gray-500);
  font-size: 12px;
`;

const Viewport = styled.main`
  position: relative;
  min-height: 0;
  flex: 1;
  overflow: hidden;
`;

const ViewLayer = styled.div`
  position: absolute;
  inset: 0;
  visibility: ${(props) => (props.$hidden ? "hidden" : "visible")};
  pointer-events: ${(props) => (props.$hidden ? "none" : "auto")};
`;

const Workspace = styled.div`
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr) 330px;
  height: 100%;
  min-height: 0;

  @media (max-width: 1050px) {
    grid-template-columns: 260px minmax(0, 1fr);

    > :last-child {
      grid-column: 1 / -1;
      display: none;
    }
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;

    > :first-child {
      display: none;
    }
  }
`;

const Rail = styled.aside`
  min-width: 0;
  overflow-y: auto;
  border-right: 1px solid var(--border);
  background: var(--paper);

  &:last-child {
    border-right: 0;
    border-left: 1px solid var(--border);
  }
`;

const Main = styled.section`
  min-width: 0;
  overflow-y: auto;
  padding: 28px clamp(24px, 4vw, 52px) 60px;
  background: var(--canvas);
`;

const RailHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 20px 18px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--paper);
`;

const Eyebrow = styled.div`
  color: var(--gray-600);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const Heading = styled.h1`
  margin: 5px 0 0;
  color: var(--ink);
  font-size: 23px;
  font-weight: 650;
  letter-spacing: -0.025em;
`;

const Intro = styled.p`
  max-width: 690px;
  margin: 8px 0 22px;
  color: var(--gray-700);
  font-size: 12px;
  line-height: 1.55;
`;

const List = styled.div`
  padding: 8px;
`;

const ListItem = styled.button`
  width: 100%;
  padding: 11px 10px;
  border: 0;
  border-left: 2px solid ${(props) => (props.$active ? "var(--accent)" : "transparent")};
  border-radius: 0 5px 5px 0;
  background: ${(props) => (props.$active ? "var(--accent-light)" : "transparent")};
  color: inherit;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: var(--button-bg-hover);
  }
`;

const ListTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const ListTitle = styled.strong`
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ListMeta = styled.div`
  margin-top: 5px;
  color: var(--gray-600);
  font-size: 10px;
  line-height: 1.35;
`;

const tone = (status) =>
  ({ completed: "var(--green-500)", running: "var(--blue-500)", failed: "var(--red-500)", superseded: "var(--gray-600)" })[status] ||
  "var(--orange-500)";

const Status = styled.span`
  flex: 0 0 auto;
  color: ${(props) => tone(props.$status)};
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
`;

const Section = styled.section`
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
`;

const SectionTitle = styled.h2`
  margin: 0 0 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Form = styled.form`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--paper);
`;

const Field = styled.label`
  display: grid;
  gap: 5px;
  color: var(--gray-700);
  font-size: 10px;
  font-weight: 650;

  &[data-wide="true"] {
    grid-column: 1 / -1;
  }
`;

const Input = styled.input`
  width: 100%;
  min-height: 34px;
  padding: 7px 9px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--paper);
  color: inherit;
  box-sizing: border-box;
  font: inherit;

  &:focus-visible {
    border-color: var(--accent);
    outline: 2px solid var(--accent-light);
  }
`;

const Select = styled.select`
  width: 100%;
  min-height: 34px;
  padding: 7px 9px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--paper);
  color: inherit;
  box-sizing: border-box;
  font: inherit;

  &:focus-visible {
    border-color: var(--accent);
    outline: 2px solid var(--accent-light);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 68px;
  padding: 7px 9px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: var(--paper);
  color: inherit;
  box-sizing: border-box;
  resize: vertical;
  font: inherit;

  &:focus-visible {
    border-color: var(--accent);
    outline: 2px solid var(--accent-light);
  }
`;

const Button = styled.button`
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid ${(props) => (props.$primary ? "var(--accent)" : "var(--border)")};
  border-radius: 5px;
  background: ${(props) => (props.$primary ? "var(--accent)" : "var(--paper)")};
  color: ${(props) => (props.$primary ? "white" : "inherit")};
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  font-weight: 650;

  &:hover:not(:disabled) {
    filter: brightness(0.97);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: default;
    opacity: 0.45;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 12px;
`;

const DataGrid = styled.dl`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  margin: 18px 0 0;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--border);

  div {
    min-width: 0;
    padding: 13px;
    background: var(--paper);
  }

  dt {
    color: var(--gray-600);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  dd {
    margin: 5px 0 0;
    overflow-wrap: anywhere;
    font-size: 12px;
    font-weight: 600;
  }
`;

const KeyValues = styled.div`
  display: grid;
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--border);
`;

const KeyValue = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(70px, 0.6fr) auto;
  gap: 12px;
  padding: 9px 11px;
  background: var(--paper);
  font-size: 11px;

  strong {
    min-width: 0;
    color: var(--gray-700);
    font-weight: 550;
    overflow-wrap: anywhere;
  }

  span {
    overflow-wrap: anywhere;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  button {
    min-height: 26px;
  }
`;

const Empty = styled.div`
  margin: 20px;
  padding: 18px;
  border-left: 2px solid var(--accent);
  background: var(--gray-100);
  color: var(--gray-700);
  font-size: 11px;
  line-height: 1.55;
`;

const Path = styled.div`
  margin-top: 14px;
  padding: 13px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--paper);
  color: var(--gray-700);
  font-size: 10px;
  line-height: 1.7;

  strong {
    color: var(--ink);
  }
`;

const ImpactItem = styled.button`
  width: 100%;
  padding: 12px 18px;
  border: 0;
  border-bottom: 1px solid var(--border);
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: var(--button-bg-hover);
  }
`;

const evidenceKindForType = (type) =>
  ({ configuration: "methodology", "figure-source": "figure-result", "table-source": "table-result" })[type] || "quantitative-result";

const resultText = (evidence, run, kind) => {
  const result = evidence.metric || evidence.value || evidence.label;
  if (kind === "figure") return `![${evidence.label}](${evidence.uri || evidence.label})`;
  if (kind === "table")
    return `| Result | Value | Run |\n| --- | ---: | --- |\n| ${evidence.label} | ${result} | ${run?.name || evidence.experimentId || "Recorded run"} |`;
  if (kind === "method") return `The selected experimental configuration is **${result}** (${run?.name || evidence.experimentId || "recorded run"}).`;
  return `${run?.name || "The experiment"} produced **${result}**.`;
};

const createPaperObject = (editorState, provenance, evidence, kind) => {
  const view = editorState.editorView.value;
  if (!view) return null;
  const run = provenance.data.peek().experiments.find((item) => item.id === evidence.experimentId);
  const snippet = resultText(evidence, run, kind);
  const source = view.state.doc.toString();
  const heading = source.includes("## Experiment evidence") ? "\n\n" : "\n\n## Experiment evidence\n\n";
  const from = source.length + heading.length;
  view.dispatch({
    changes: { from: source.length, insert: `${heading}${snippet}` },
    selection: { anchor: from, head: from + snippet.length },
    scrollIntoView: true,
  });
  const object = provenance.createObject(
    {
      kind,
      snippet,
      from,
      to: from + snippet.length,
      line: `${source}${heading}`.split("\n").length,
      section: { title: "Experiment evidence", level: 2, line: `${source}${heading}`.split("\n").length - 1 },
    },
    kind,
  );
  if (!object) return null;
  provenance.linkEvidence(object.id, evidence.id, kind === "figure" ? "produces" : kind === "method" ? "describes" : "supports");
  editorState.workspaceView.value = "paper";
  editorState.integrityPanelOpen.value = true;
  editorState.activeEvidenceId.value = evidence.id;
  requestAnimationFrame(() => {
    view.dispatch({ selection: { anchor: from, head: from + snippet.length }, scrollIntoView: true });
    view.focus();
  });
  return object;
};

function ExperimentsWorkspace({ provenance }) {
  const editorState = useContext(MystState);
  const data = provenance.data.value;
  const [creating, setCreating] = useState(false);
  const [newRun, setNewRun] = useState({ name: "", method: "", sourceCommit: "", notes: "" });
  const [metric, setMetric] = useState({ key: "", value: "" });
  const [parameter, setParameter] = useState({ key: "", value: "" });
  const [artifact, setArtifact] = useState({ label: "", type: "result", uri: "" });
  const [dataset, setDataset] = useState("");
  const [compareId, setCompareId] = useState("");
  const requestedActiveId = editorState.activeExperimentId.value;
  const active = data.experiments.find((item) => item.id === requestedActiveId) || data.experiments.at(-1) || null;
  const activeId = active?.id || null;
  const evidence = active ? data.evidence.filter((item) => item.experimentId === active.id) : [];
  const affectedObjectIds = new Set(data.links.filter((link) => evidence.some((item) => item.id === link.evidenceId)).map((link) => link.objectId));
  const affectedObjects = data.objects.filter((item) => affectedObjectIds.has(item.id));
  const comparison = data.experiments.find((item) => item.id === compareId);
  const publishMetric = (key, value) => {
    const metricValue = String(value);
    const evidenceItem = provenance.addStandaloneEvidence({
      type: "experiment-result",
      evidenceKind: "quantitative-result",
      label: `${active.name} · ${key}`,
      experimentId: active.id,
      commit: active.sourceCommit,
      artifactId: active.artifacts[0]?.id || "",
      metric: `${key}=${metricValue}`,
      value: metricValue,
      uri: active.artifacts[0]?.uri || "",
      notes: `Published from ${active.id}.`,
    });
    if (evidenceItem) editorState.activeEvidenceId.value = evidenceItem.id;
  };

  const submitRun = (event) => {
    event.preventDefault();
    const created = provenance.createExperiment(newRun);
    if (!created) return;
    editorState.activeExperimentId.value = created.id;
    setNewRun({ name: "", method: "", sourceCommit: "", notes: "" });
    setCreating(false);
  };

  const loadDemo = () => {
    provenance.replaceData(buildDemoResearchProject(editorState.text.text.value));
    editorState.activeExperimentId.value = "stress-run-08";
  };

  return (
    <Workspace data-testid="experiments-workspace">
      <Rail>
        <RailHeader>
          <ListTop>
            <div>
              <Eyebrow>Research runs</Eyebrow>
              <ListTitle>{data.experiments.length} experiments</ListTitle>
            </div>
            <Button type="button" onClick={() => setCreating((value) => !value)}>
              {creating ? "Cancel" : "+ New run"}
            </Button>
          </ListTop>
        </RailHeader>
        {data.experiments.length ? (
          <List>
            {data.experiments.map((run) => (
              <ListItem
                $active={run.id === activeId}
                data-testid="experiment-list-item"
                key={run.id}
                type="button"
                onClick={() => (editorState.activeExperimentId.value = run.id)}
              >
                <ListTop>
                  <ListTitle>{run.name}</ListTitle>
                  <Status $status={run.status}>{run.status}</Status>
                </ListTop>
                <ListMeta>
                  {run.id} · {run.method || "Method not recorded"}
                </ListMeta>
              </ListItem>
            ))}
          </List>
        ) : (
          <Empty>
            No runs yet. Record an experiment manually, or load the deterministic lifecycle demo.
            <ButtonRow>
              <Button $primary data-testid="load-lifecycle-demo" type="button" onClick={loadDemo}>
                Load demo lifecycle
              </Button>
            </ButtonRow>
          </Empty>
        )}
      </Rail>

      <Main>
        <Eyebrow>Experiments</Eyebrow>
        <Heading>{creating ? "Record a research run" : active ? active.name : "What did the research produce?"}</Heading>
        <Intro>Runs are useful here because they create traceable evidence—not because Potter’s Wheel is trying to orchestrate infrastructure.</Intro>

        {creating && (
          <Form onSubmit={submitRun}>
            <Field>
              Run name
              <Input required value={newRun.name} onInput={(e) => setNewRun({ ...newRun, name: e.currentTarget.value })} />
            </Field>
            <Field>
              Method / model
              <Input value={newRun.method} onInput={(e) => setNewRun({ ...newRun, method: e.currentTarget.value })} />
            </Field>
            <Field>
              Source commit
              <Input value={newRun.sourceCommit} onInput={(e) => setNewRun({ ...newRun, sourceCommit: e.currentTarget.value })} />
            </Field>
            <Field data-wide="true">
              Notes
              <TextArea value={newRun.notes} onInput={(e) => setNewRun({ ...newRun, notes: e.currentTarget.value })} />
            </Field>
            <Button $primary type="submit">
              Create experiment
            </Button>
          </Form>
        )}

        {active && !creating && (
          <>
            <DataGrid>
              <div>
                <dt>Status</dt>
                <dd>
                  <Status $status={active.status}>{active.status}</Status>
                </dd>
              </div>
              <div>
                <dt>Run ID</dt>
                <dd>{active.id}</dd>
              </div>
              <div>
                <dt>Source commit</dt>
                <dd>{active.sourceCommit || "—"}</dd>
              </div>
              <div>
                <dt>Method</dt>
                <dd>{active.method || "—"}</dd>
              </div>
              <div>
                <dt>Evidence produced</dt>
                <dd>{evidence.length}</dd>
              </div>
              <div>
                <dt>Paper dependencies</dt>
                <dd>{affectedObjects.length}</dd>
              </div>
            </DataGrid>
            <ButtonRow>
              {EXPERIMENT_STATUSES.filter((status) => ![active.status, "superseded"].includes(status)).map((status) => (
                <Button
                  key={status}
                  type="button"
                  onClick={() =>
                    provenance.updateExperiment(active.id, { status, ...(status === "completed" ? { completedAt: new Date().toISOString() } : {}) })
                  }
                >
                  Mark {status}
                </Button>
              ))}
              <Select
                aria-label="Supersedes experiment"
                value={active.supersedesRunId || ""}
                onChange={(event) => event.currentTarget.value && provenance.supersedeExperiment(event.currentTarget.value, active.id)}
              >
                <option value="">Supersedes…</option>
                {data.experiments
                  .filter((item) => item.id !== active.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </Select>
            </ButtonRow>

            <Section>
              <SectionTitle>Metrics</SectionTitle>
              {Object.entries(active.metrics).length ? (
                <KeyValues>
                  {Object.entries(active.metrics).map(([key, value]) => {
                    const published = evidence.some((item) => item.metric === `${key}=${String(value)}`);
                    return (
                      <KeyValue key={key}>
                        <strong>{key}</strong>
                        <span>{String(value)}</span>
                        <Button data-testid="publish-metric-evidence" disabled={published} type="button" onClick={() => publishMetric(key, value)}>
                          {published ? "Published" : "Publish evidence"}
                        </Button>
                      </KeyValue>
                    );
                  })}
                </KeyValues>
              ) : (
                <Intro>No metrics recorded yet.</Intro>
              )}
              <Form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (provenance.addExperimentMetric(active.id, metric.key, metric.value)) setMetric({ key: "", value: "" });
                }}
              >
                <Field>
                  Metric
                  <Input aria-label="Metric name" value={metric.key} onInput={(e) => setMetric({ ...metric, key: e.currentTarget.value })} />
                </Field>
                <Field>
                  Value
                  <Input aria-label="Metric value" value={metric.value} onInput={(e) => setMetric({ ...metric, value: e.currentTarget.value })} />
                </Field>
                <Button type="submit">Add metric</Button>
              </Form>
            </Section>

            <Section>
              <SectionTitle>Configuration</SectionTitle>
              {Object.entries(active.parameters).length ? (
                <KeyValues>
                  {Object.entries(active.parameters).map(([key, value]) => (
                    <KeyValue key={key}>
                      <strong>{key}</strong>
                      <span>{String(value)}</span>
                      <Button
                        type="button"
                        onClick={() => {
                          const created = provenance.addStandaloneEvidence({
                            type: "configuration",
                            evidenceKind: "methodological-configuration",
                            label: `${active.name} · ${key}`,
                            experimentId: active.id,
                            commit: active.sourceCommit,
                            metric: `${key}=${String(value)}`,
                            value: String(value),
                            notes: `Configuration published from ${active.id}.`,
                          });
                          if (created) editorState.activeEvidenceId.value = created.id;
                        }}
                      >
                        Publish evidence
                      </Button>
                    </KeyValue>
                  ))}
                </KeyValues>
              ) : (
                <Intro>No parameters recorded yet.</Intro>
              )}
              <Form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (provenance.addExperimentParameter(active.id, parameter.key, parameter.value)) setParameter({ key: "", value: "" });
                }}
              >
                <Field>
                  Parameter
                  <Input
                    aria-label="Parameter name"
                    value={parameter.key}
                    onInput={(e) => setParameter({ ...parameter, key: e.currentTarget.value })}
                  />
                </Field>
                <Field>
                  Value
                  <Input
                    aria-label="Parameter value"
                    value={parameter.value}
                    onInput={(e) => setParameter({ ...parameter, value: e.currentTarget.value })}
                  />
                </Field>
                <Button type="submit">Add parameter</Button>
              </Form>
            </Section>

            <Section>
              <SectionTitle>Datasets</SectionTitle>
              {active.datasets.length ? (
                <KeyValues>
                  {active.datasets.map((item) => (
                    <KeyValue key={item}>
                      <strong>dataset</strong>
                      <span>{item}</span>
                      <span />
                    </KeyValue>
                  ))}
                </KeyValues>
              ) : (
                <Intro>No datasets recorded yet.</Intro>
              )}
              <Form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!dataset.trim()) return;
                  provenance.updateExperiment(active.id, { datasets: [...active.datasets, dataset.trim()] });
                  setDataset("");
                }}
              >
                <Field data-wide="true">
                  Dataset or manifest
                  <Input aria-label="Dataset or manifest" value={dataset} onInput={(event) => setDataset(event.currentTarget.value)} />
                </Field>
                <Button type="submit">Add dataset</Button>
              </Form>
            </Section>

            <Section>
              <SectionTitle>Artifacts</SectionTitle>
              {active.artifacts.length ? (
                <KeyValues>
                  {active.artifacts.map((item) => (
                    <KeyValue key={item.id}>
                      <strong>{item.type}</strong>
                      <span>{item.uri || item.label}</span>
                      <Button
                        type="button"
                        onClick={() => {
                          const created = provenance.addStandaloneEvidence({
                            type: item.type === "figure" ? "figure-source" : "result-file",
                            evidenceKind: item.type === "figure" ? "figure-generating-result" : "quantitative-result",
                            label: item.label,
                            experimentId: active.id,
                            commit: active.sourceCommit,
                            artifactId: item.id,
                            uri: item.uri,
                          });
                          if (created) editorState.activeEvidenceId.value = created.id;
                        }}
                      >
                        Publish evidence
                      </Button>
                    </KeyValue>
                  ))}
                </KeyValues>
              ) : (
                <Intro>No result artifacts attached yet.</Intro>
              )}
              <Form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (provenance.attachExperimentArtifact(active.id, artifact)) setArtifact({ label: "", type: "result", uri: "" });
                }}
              >
                <Field>
                  Label
                  <Input
                    aria-label="Artifact label"
                    value={artifact.label}
                    onInput={(e) => setArtifact({ ...artifact, label: e.currentTarget.value })}
                  />
                </Field>
                <Field>
                  Type
                  <Input
                    aria-label="Artifact type"
                    value={artifact.type}
                    onInput={(e) => setArtifact({ ...artifact, type: e.currentTarget.value })}
                  />
                </Field>
                <Field data-wide="true">
                  URI
                  <Input aria-label="Artifact URI" value={artifact.uri} onInput={(e) => setArtifact({ ...artifact, uri: e.currentTarget.value })} />
                </Field>
                <Button type="submit">Attach artifact</Button>
              </Form>
            </Section>

            {data.experiments.length > 1 && (
              <Section>
                <SectionTitle>Compare runs</SectionTitle>
                <Select aria-label="Compare experiment" value={compareId} onChange={(event) => setCompareId(event.currentTarget.value)}>
                  <option value="">Choose another run…</option>
                  {data.experiments
                    .filter((item) => item.id !== active.id)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </Select>
                {comparison && (
                  <KeyValues>
                    {[...new Set([...Object.keys(comparison.metrics), ...Object.keys(active.metrics)])]
                      .filter((key) => String(comparison.metrics[key] ?? "") !== String(active.metrics[key] ?? ""))
                      .map((key) => (
                        <KeyValue key={`metric-${key}`}>
                          <strong>{key}</strong>
                          <span>
                            {String(comparison.metrics[key] ?? "—")} → {String(active.metrics[key] ?? "—")}
                          </span>
                          <span />
                        </KeyValue>
                      ))}
                    {[...new Set([...Object.keys(comparison.parameters), ...Object.keys(active.parameters)])]
                      .filter((key) => String(comparison.parameters[key] ?? "") !== String(active.parameters[key] ?? ""))
                      .map((key) => (
                        <KeyValue key={`parameter-${key}`}>
                          <strong>{key}</strong>
                          <span>
                            {String(comparison.parameters[key] ?? "—")} → {String(active.parameters[key] ?? "—")}
                          </span>
                          <span />
                        </KeyValue>
                      ))}
                  </KeyValues>
                )}
              </Section>
            )}
          </>
        )}
      </Main>

      <Rail>
        <RailHeader>
          <Eyebrow>Research impact</Eyebrow>
          <ListTitle>Evidence → paper</ListTitle>
        </RailHeader>
        {active ? (
          <>
            <Empty>{active.notes || "This run has no research notes yet."}</Empty>
            {evidence.map((item) => (
              <ImpactItem
                key={item.id}
                type="button"
                onClick={() => {
                  editorState.activeEvidenceId.value = item.id;
                  editorState.workspaceView.value = "evidence";
                }}
              >
                <ListTitle>{item.label}</ListTitle>
                <ListMeta>{item.metric || item.type}</ListMeta>
              </ImpactItem>
            ))}
            {!evidence.length && <Empty>Complete the run, then turn a metric or artifact into evidence for the manuscript.</Empty>}
            {affectedObjects.map((object) => (
              <ImpactItem
                key={object.id}
                type="button"
                onClick={() => {
                  editorState.workspaceView.value = "paper";
                  editorState.integrityPanelOpen.value = true;
                }}
              >
                <Status $status={object.verificationState}>{object.verificationState}</Status>
                <ListMeta>
                  {object.kind} · {object.text}
                </ListMeta>
              </ImpactItem>
            ))}
          </>
        ) : (
          <Empty>Select a run to trace what it produced and where the paper uses it.</Empty>
        )}
      </Rail>
    </Workspace>
  );
}

function EvidenceWorkspace({ provenance }) {
  const editorState = useContext(MystState);
  const data = provenance.data.value;
  const [targetObjectId, setTargetObjectId] = useState("");
  const requestedActiveId = editorState.activeEvidenceId.value;
  const active = data.evidence.find((item) => item.id === requestedActiveId) || data.evidence.at(-1) || null;
  const activeId = active?.id || null;
  const run = active ? data.experiments.find((item) => item.id === active.experimentId) : null;
  const links = active ? data.links.filter((link) => link.evidenceId === active.id) : [];
  const linkedObjects = links.map((link) => data.objects.find((item) => item.id === link.objectId)).filter(Boolean);

  return (
    <Workspace data-testid="evidence-workspace">
      <Rail>
        <RailHeader>
          <Eyebrow>Evidence catalog</Eyebrow>
          <ListTitle>{data.evidence.length} research results</ListTitle>
        </RailHeader>
        {data.evidence.length ? (
          <List>
            {data.evidence.map((item) => (
              <ListItem
                $active={item.id === activeId}
                data-testid="evidence-list-item"
                key={item.id}
                type="button"
                onClick={() => (editorState.activeEvidenceId.value = item.id)}
              >
                <ListTop>
                  <ListTitle>{item.label}</ListTitle>
                  <Status $status={item.supersededByEvidenceId ? "superseded" : "completed"}>
                    {item.supersededByEvidenceId ? "older" : "current"}
                  </Status>
                </ListTop>
                <ListMeta>
                  {item.metric || item.type} · {item.experimentId || "manual evidence"}
                </ListMeta>
              </ListItem>
            ))}
          </List>
        ) : (
          <Empty>Experiments produce evidence. Complete a run and publish a metric or artifact here.</Empty>
        )}
      </Rail>

      <Main>
        <Eyebrow>Evidence</Eyebrow>
        <Heading>{active?.label || "The bridge between runs and writing"}</Heading>
        <Intro>
          Evidence is the durable research fact the paper depends on. It retains the run, artifact, configuration, and commit that produced it.
        </Intro>
        {active && (
          <>
            <DataGrid>
              <div>
                <dt>Kind</dt>
                <dd>{active.evidenceKind || evidenceKindForType(active.type)}</dd>
              </div>
              <div>
                <dt>Research value</dt>
                <dd>{active.metric || active.value || "—"}</dd>
              </div>
              <div>
                <dt>Paper uses</dt>
                <dd>{linkedObjects.length}</dd>
              </div>
              <div>
                <dt>Run</dt>
                <dd>{run?.name || active.experimentId || "Manual"}</dd>
              </div>
              <div>
                <dt>Commit</dt>
                <dd>{active.commit || run?.sourceCommit || "—"}</dd>
              </div>
              <div>
                <dt>Artifact</dt>
                <dd>{active.uri || active.artifactId || "—"}</dd>
              </div>
            </DataGrid>
            <Path>
              <strong>RUN</strong> {run?.name || active.experimentId || "Manual record"}
              <br />↓<br />
              <strong>RESULT / EVIDENCE</strong> {active.metric || active.label}
              <br />↓<br />
              <strong>PAPER</strong> {linkedObjects.length ? linkedObjects.map((item) => `${item.kind}: ${item.text}`).join(" · ") : "Not used yet"}
            </Path>

            <Section>
              <SectionTitle>Use this result in the paper</SectionTitle>
              <ButtonRow>
                <Button
                  $primary
                  data-testid="create-linked-claim"
                  type="button"
                  onClick={() => createPaperObject(editorState, provenance, active, "claim")}
                >
                  Create linked claim
                </Button>
                <Button type="button" onClick={() => createPaperObject(editorState, provenance, active, "table")}>
                  Create table
                </Button>
                <Button type="button" disabled={!active.uri} onClick={() => createPaperObject(editorState, provenance, active, "figure")}>
                  Associate figure
                </Button>
                <Button type="button" onClick={() => createPaperObject(editorState, provenance, active, "method")}>
                  Link methodology
                </Button>
              </ButtonRow>
              <Form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (targetObjectId) provenance.linkEvidence(targetObjectId, active.id);
                }}
              >
                <Field data-wide="true">
                  Existing manuscript object
                  <Select aria-label="Existing manuscript object" value={targetObjectId} onChange={(e) => setTargetObjectId(e.currentTarget.value)}>
                    <option value="">Choose a claim, figure, table, or method…</option>
                    {data.objects.map((object) => (
                      <option key={object.id} value={object.id}>
                        {object.kind}: {object.text.slice(0, 80)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button type="submit" disabled={!targetObjectId}>
                  Link existing object
                </Button>
              </Form>
            </Section>
          </>
        )}
      </Main>

      <Rail>
        <RailHeader>
          <Eyebrow>Bidirectional trace</Eyebrow>
          <ListTitle>Origin & manuscript usage</ListTitle>
        </RailHeader>
        {run && (
          <ImpactItem
            type="button"
            onClick={() => {
              editorState.activeExperimentId.value = run.id;
              editorState.workspaceView.value = "experiments";
            }}
          >
            <ListTitle>← {run.name}</ListTitle>
            <ListMeta>
              {run.id} · {run.status}
            </ListMeta>
          </ImpactItem>
        )}
        {linkedObjects.map((object) => (
          <ImpactItem
            key={object.id}
            type="button"
            onClick={() => {
              editorState.workspaceView.value = "paper";
              editorState.integrityPanelOpen.value = true;
            }}
          >
            <Status $status={object.verificationState}>{object.verificationState}</Status>
            <ListMeta>
              {object.kind} · {object.text}
            </ListMeta>
          </ImpactItem>
        ))}
        {!linkedObjects.length && (
          <Empty>This result is not used in the manuscript yet. Choose an action in the center pane to create the first connection.</Empty>
        )}
      </Rail>
    </Workspace>
  );
}

export function ResearchWorkspace({ children }) {
  const editorState = useContext(MystState);
  const provenance = ensureProvenanceStore(editorState);
  const data = provenance.data.value;
  const view = editorState.workspaceView.value;
  const linkedCount = useMemo(() => new Set(data.links.map((link) => link.objectId)).size, [data.links]);

  return (
    <Shell>
      <Lifecycle aria-label="Research lifecycle">
        <Promise>
          <strong>From experiment to paper, without breaking provenance.</strong>
          <span>One workspace for the evidence behind every manuscript decision.</span>
        </Promise>
        <LifecycleSteps>
          <Step
            $active={view === "experiments"}
            aria-current={view === "experiments" ? "page" : undefined}
            data-testid="nav-experiments"
            type="button"
            onClick={() => (editorState.workspaceView.value = "experiments")}
          >
            Experiments <Count>{data.experiments.length}</Count>
          </Step>
          <Arrow>→</Arrow>
          <Step
            $active={view === "evidence"}
            aria-current={view === "evidence" ? "page" : undefined}
            data-testid="nav-evidence"
            type="button"
            onClick={() => (editorState.workspaceView.value = "evidence")}
          >
            Evidence <Count>{data.evidence.length}</Count>
          </Step>
          <Arrow>→</Arrow>
          <Step
            $active={view === "paper"}
            aria-current={view === "paper" ? "page" : undefined}
            data-testid="nav-paper"
            type="button"
            onClick={() => (editorState.workspaceView.value = "paper")}
          >
            Paper <Count>{linkedCount}</Count>
          </Step>
        </LifecycleSteps>
      </Lifecycle>
      <Viewport>
        <ViewLayer $hidden={view !== "paper"}>{children}</ViewLayer>
        <ViewLayer $hidden={view !== "experiments"}>{view === "experiments" && <ExperimentsWorkspace provenance={provenance} />}</ViewLayer>
        <ViewLayer $hidden={view !== "evidence"}>{view === "evidence" && <EvidenceWorkspace provenance={provenance} />}</ViewLayer>
      </Viewport>
    </Shell>
  );
}
