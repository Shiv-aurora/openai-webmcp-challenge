import { useContext, useEffect, useState } from "preact/hooks";
import { styled } from "styled-components";
import { MystState } from "../mystState";
import { ensureProvenanceStore, EXPERIMENT_STATUSES } from "../integrity/provenance";
import { buildDemoResearchProject } from "../demo/researchProject";
import { DefaultButton, Field, Hint, Input, Mono, PropertyList, PropertyRow, Select, Tag, TextArea } from "../components/CommonUI";

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100% - 45px);
  min-height: 0;
  background: var(--canvas);
`;

/** Tab strip rather than a stepper: the three stages are places you move between freely, and an
 * underline marks the current one without adding another filled control to the chrome. */
const Lifecycle = styled.nav`
  display: flex;
  align-items: stretch;
  gap: 20px;
  height: 40px;
  padding: 0 16px;
  border-bottom: 1px solid var(--hairline);
  /* One step below the topbar and below the content it switches, so the navigation layer reads as
     chrome rather than as the top of the document. */
  background: var(--panel-bg);
  box-sizing: border-box;
`;

const Step = styled.button`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 2px;
  border: 0;
  border-bottom: 2px solid ${(props) => (props.$active ? "var(--ink)" : "transparent")};
  background: transparent;
  color: ${(props) => (props.$active ? "var(--ink)" : "var(--ink-tertiary)")};
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  transition:
    color 20ms ease-in,
    border-color 20ms ease-in;

  &:hover {
    color: var(--ink);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
`;

const Count = styled.span`
  color: var(--ink-faint);
  font-size: 13px;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
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
  grid-template-columns: 264px minmax(0, 1fr) 300px;
  height: 100%;
  min-height: 0;

  @media (max-width: 1100px) {
    grid-template-columns: 240px minmax(0, 1fr);

    > :last-child {
      grid-column: 1 / -1;
      display: none;
    }
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;

    > :first-child {
      display: none;
    }
  }
`;

const Rail = styled.aside`
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-y: auto;
  border-right: 1px solid var(--hairline);
  background: var(--sidebar-bg);

  &:last-child {
    border-right: 0;
    border-left: 1px solid var(--hairline);
  }
`;

const Main = styled.section`
  min-width: 0;
  overflow-y: auto;
  background: var(--paper);
`;

/** A measured reading column. Research detail is long-form, so it gets a max width rather than
 * stretching metric labels halfway across a wide display. */
const Content = styled.div`
  max-width: 820px;
  padding: 40px clamp(24px, 5vw, 60px) 96px;
`;

const RailHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 40px;
  padding: 8px 10px 8px 12px;
  background: var(--sidebar-bg);
`;

const RailTitle = styled.div`
  min-width: 0;
  overflow: hidden;
  color: var(--ink-tertiary);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Heading = styled.h1`
  margin: 0;
  color: var(--ink);
  font-size: 30px;
  font-weight: 650;
  line-height: 1.2;
  letter-spacing: -0.025em;
`;

const Intro = styled.p`
  margin: 10px 0 0;
  color: var(--ink-tertiary);
  font-size: 15px;
  line-height: 1.55;
`;

const List = styled.div`
  display: grid;
  gap: 1px;
  padding: 0 6px 12px;
`;

/** Sidebar row: no card, no left accent bar. Selection is a tinted background, the same signal
 * the rest of the app uses for "current". */
const ListItem = styled.button`
  display: grid;
  gap: 2px;
  width: 100%;
  padding: 6px 8px;
  border: 0;
  border-radius: var(--radius);
  background: ${(props) => (props.$active ? "var(--active)" : "transparent")};
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;

  &:hover {
    background: ${(props) => (props.$active ? "var(--active)" : "var(--hover)")};
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
`;

const ListTitle = styled.strong`
  display: block;
  min-width: 0;
  overflow: hidden;
  color: var(--ink);
  font-size: 14px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/** The status tag sits on the metadata row rather than beside the title, which would otherwise
 * cost the title ~90px of a 264px rail and truncate most run names mid-word. */
const ListMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: var(--ink-tertiary);
  font-size: 13px;
  line-height: 1.4;

  > span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Section = styled.section`
  margin-top: 36px;
`;

const SectionTitle = styled.h2`
  margin: 0 0 10px;
  color: var(--ink);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
`;

const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin: 14px 0 22px;

  @media (max-width: 850px) {
    grid-template-columns: 1fr;
  }
`;

const ChartFigure = styled.figure`
  min-width: 0;
  margin: 0;
  padding: 14px 14px 10px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius);
  background: var(--panel-bg);

  figcaption {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
    color: var(--ink);
    font-size: 13px;
    font-weight: 600;
  }

  figcaption span {
    color: var(--ink-faint);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 400;
  }

  svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }
`;

const formatMetric = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value ?? "—");
  return number > 0 && number <= 1 ? `${(number * 100).toFixed(1)}%` : number.toLocaleString(undefined, { maximumFractionDigits: 3 });
};

function RunPerformanceChart({ runs, activeId }) {
  const metricKey = runs.some((item) => Number.isFinite(Number(item.metrics?.reasoning_index))) ? "reasoning_index" : "test_macro_f1";
  const metricLabel = metricKey === "reasoning_index" ? "Astra Reasoning Index" : "Test macro-F1";
  const values = runs.filter((item) => Number.isFinite(Number(item.metrics?.[metricKey])));
  if (!values.length) return null;
  const width = 360;
  const height = 190;
  const left = 34;
  const bottom = 36;
  const plotHeight = height - bottom - 14;
  const slot = (width - left - 10) / values.length;
  const lowerBound = metricKey === "reasoning_index" ? 0.45 : 0.55;
  const upperBound = metricKey === "reasoning_index" ? 0.85 : 0.95;
  const ticks = metricKey === "reasoning_index" ? [0.5, 0.6, 0.7, 0.8] : [0.6, 0.7, 0.8, 0.9];
  return (
    <ChartFigure data-testid="run-performance-chart">
      <figcaption>
        {metricLabel} <span>tracked evaluation runs</span>
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${metricLabel} across experiment runs`}>
        {ticks.map((tick) => {
          const y = 14 + plotHeight * (1 - (tick - lowerBound) / (upperBound - lowerBound));
          return (
            <g key={tick}>
              <line x1={left} x2={width - 10} y1={y} y2={y} stroke="var(--hairline)" />
              <text x={left - 6} y={y + 3} text-anchor="end" fill="var(--ink-faint)" font-size="9">
                {Math.round(tick * 100)}
              </text>
            </g>
          );
        })}
        {values.map((item, index) => {
          const value = Number(item.metrics[metricKey]);
          const barHeight = Math.max(2, plotHeight * ((value - lowerBound) / (upperBound - lowerBound)));
          const x = left + index * slot + slot * 0.2;
          const y = 14 + plotHeight - barHeight;
          return (
            <g key={item.id}>
              <rect x={x} y={y} width={slot * 0.58} height={barHeight} rx="2" fill={item.id === activeId ? "var(--ink)" : "var(--gray-300)"} />
              <text x={x + slot * 0.29} y={y - 5} text-anchor="middle" fill="var(--ink-secondary)" font-size="9">
                {(value * 100).toFixed(1)}
              </text>
              <text x={x + slot * 0.29} y={height - 16} text-anchor="middle" fill="var(--ink-faint)" font-size="9">
                #{item.name.match(/#(\d+)/)?.[1] || index + 1}
              </text>
            </g>
          );
        })}
      </svg>
    </ChartFigure>
  );
}

function MetricHistoryChart({ metricHistory }) {
  const series = Object.entries(metricHistory || {}).find(([, points]) => Array.isArray(points) && points.length > 1);
  if (!series) return null;
  const [key, points] = series;
  const width = 360;
  const height = 190;
  const values = points.map((point) => Number(point.value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const coords = points.map((point, index) => ({
    x: 28 + (index / Math.max(1, points.length - 1)) * 316,
    y: 18 + (1 - (Number(point.value) - min) / range) * 122,
    value: point.value,
    step: point.step,
  }));
  return (
    <ChartFigure data-testid="metric-history-chart">
      <figcaption>
        {key.replaceAll("_", " ")} <span>{points.length} logged steps</span>
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${key} metric history`}>
        {[18, 79, 140].map((y) => (
          <line key={y} x1="28" x2="344" y1={y} y2={y} stroke="var(--hairline)" />
        ))}
        <polyline
          points={coords.map((point) => `${point.x},${point.y}`).join(" ")}
          fill="none"
          stroke="var(--ink)"
          stroke-width="2"
          stroke-linejoin="round"
        />
        {coords.map((point) => (
          <circle key={point.step} cx={point.x} cy={point.y} r="2.5" fill="var(--paper)" stroke="var(--ink)" stroke-width="1.5">
            <title>{`Step ${point.step}: ${formatMetric(point.value)}`}</title>
          </circle>
        ))}
        <text x="28" y="160" fill="var(--ink-faint)" font-size="9">
          step {points[0].step}
        </text>
        <text x="344" y="160" text-anchor="end" fill="var(--ink-faint)" font-size="9">
          step {points.at(-1).step}
        </text>
        <text x="344" y="12" text-anchor="end" fill="var(--ink-secondary)" font-size="10">
          latest {formatMetric(points.at(-1).value)}
        </text>
      </svg>
    </ChartFigure>
  );
}

const Form = styled.form`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-items: end;
  margin-top: 16px;

  &[data-standalone="true"] {
    margin-top: 0;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
`;

const Summary = styled(PropertyList)`
  margin-top: 24px;
`;

/** Key/value rows separated by hairlines instead of a bordered grid of boxes. */
const KeyValues = styled.div`
  display: grid;
  border-top: 1px solid var(--hairline);
`;

const KeyValue = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(80px, 0.7fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 40px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--hairline);
  font-size: 14px;

  &:hover {
    background: var(--hover);
  }

  strong {
    min-width: 0;
    color: var(--ink);
    font-weight: 400;
    overflow-wrap: anywhere;
  }

  > span {
    min-width: 0;
    color: var(--ink-secondary);
    font-family: var(--font-mono);
    font-size: 13px;
    overflow-wrap: anywhere;
  }
`;

const RailBody = styled.div`
  display: grid;
  gap: 1px;
  padding: 0 6px 12px;
`;

const RailNote = styled.p`
  margin: 0;
  padding: 2px 8px 10px;
  color: var(--ink-tertiary);
  font-size: 13px;
  line-height: 1.5;
`;

const RailEmpty = styled.div`
  padding: 4px 14px 16px;
  color: var(--ink-tertiary);
  font-size: 13px;
  line-height: 1.55;
`;

/** The run → evidence → paper chain, drawn as a trace with a connector rather than typed arrows. */
const Path = styled.div`
  display: grid;
  gap: 0;
  margin-top: 24px;
`;

/** Flex rather than grid so the step's value can stay a bare text node: it becomes an anonymous
 * flex item and still lines up in its own column, which keeps each value a single addressable
 * piece of text instead of nesting another element around it. */
const PathStep = styled.div`
  display: flex;
  gap: 14px;
  align-items: baseline;
  padding: 10px 0;
  position: relative;
  color: var(--ink);
  font-size: 14px;
  line-height: 1.5;
  overflow-wrap: anywhere;

  & + &::before {
    content: "";
    position: absolute;
    left: 26px;
    top: -10px;
    width: 1px;
    height: 20px;
    background: var(--gray-300);
  }

  strong {
    flex: 0 0 74px;
    color: var(--ink-faint);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
  }
`;

/** A single constrained column, so long artifact paths and manuscript excerpts truncate inside the
 * rail instead of widening it. `justify-items: start` keeps the status tag at its natural size. */
const ImpactItem = styled.button`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 3px;
  justify-items: start;
  width: 100%;
  padding: 7px 8px;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;

  > * {
    max-width: 100%;
  }

  &:hover {
    background: var(--hover);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
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
  const active =
    data.experiments.find((item) => item.id === requestedActiveId) ||
    data.experiments.find((item) => item.tags?.stage === "locked-eval") ||
    data.experiments.at(-1) ||
    null;
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
    editorState.activeExperimentId.value = "astra-run-254";
  };

  return (
    <Workspace data-testid="experiments-workspace">
      <Rail>
        <RailHeader>
          <RailTitle>{data.experiments.length} experiments</RailTitle>
          <DefaultButton type="button" onClick={() => setCreating((value) => !value)}>
            {creating ? "Cancel" : "+ New run"}
          </DefaultButton>
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
                <ListTitle>{run.name}</ListTitle>
                <ListMeta>
                  <Tag $status={run.status}>{run.status}</Tag>
                  <span>
                    {run.id} · {run.method || "Method not recorded"}
                  </span>
                </ListMeta>
              </ListItem>
            ))}
          </List>
        ) : (
          <RailEmpty>
            No runs yet. Record an experiment manually, or load the deterministic lifecycle demo.
            <ButtonRow>
              <DefaultButton $variant="outline" data-testid="load-lifecycle-demo" type="button" onClick={loadDemo}>
                Load demo lifecycle
              </DefaultButton>
            </ButtonRow>
          </RailEmpty>
        )}
      </Rail>

      <Main>
        <Content>
          <Heading>{creating ? "Record a research run" : active ? active.name : "What did the research produce?"}</Heading>
          <Intro>Synthetic pretraining, post-training, and evaluation runs—tracked with the same lineage as a real model program.</Intro>

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
              <div>
                <DefaultButton $variant="primary" type="submit">
                  Create experiment
                </DefaultButton>
              </div>
            </Form>
          )}

          {active && !creating && (
            <>
              <Summary>
                <PropertyRow>
                  <dt>Status</dt>
                  <dd>
                    <Tag $status={active.status}>{active.status}</Tag>
                  </dd>
                </PropertyRow>
                <PropertyRow>
                  <dt>Run ID</dt>
                  <dd>
                    <Mono>{active.id}</Mono>
                  </dd>
                </PropertyRow>
                <PropertyRow>
                  <dt>Source commit</dt>
                  <dd>{active.sourceCommit ? <Mono>{active.sourceCommit}</Mono> : "—"}</dd>
                </PropertyRow>
                <PropertyRow>
                  <dt>Duration</dt>
                  <dd>
                    {active.startedAt && active.completedAt
                      ? `${Math.round((new Date(active.completedAt) - new Date(active.startedAt)) / 60000)} min`
                      : "—"}
                  </dd>
                </PropertyRow>
                <PropertyRow>
                  <dt>Tags</dt>
                  <dd>
                    {Object.entries(active.tags || {})
                      .map(([key, value]) => `${key}:${value}`)
                      .join(" · ") || "—"}
                  </dd>
                </PropertyRow>
                <PropertyRow>
                  <dt>Method</dt>
                  <dd>{active.method || "—"}</dd>
                </PropertyRow>
                <PropertyRow>
                  <dt>Evidence produced</dt>
                  <dd>{evidence.length}</dd>
                </PropertyRow>
                <PropertyRow>
                  <dt>Paper dependencies</dt>
                  <dd>{affectedObjects.length}</dd>
                </PropertyRow>
              </Summary>
              <ButtonRow>
                {EXPERIMENT_STATUSES.filter((status) => ![active.status, "superseded"].includes(status)).map((status) => (
                  <DefaultButton
                    key={status}
                    $variant="outline"
                    type="button"
                    onClick={() =>
                      provenance.updateExperiment(active.id, { status, ...(status === "completed" ? { completedAt: new Date().toISOString() } : {}) })
                    }
                  >
                    Mark {status}
                  </DefaultButton>
                ))}
                <Select
                  aria-label="Supersedes experiment"
                  value={active.supersedesRunId || ""}
                  style={{ width: "auto", minWidth: "200px" }}
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
                <ChartGrid>
                  <RunPerformanceChart runs={data.experiments} activeId={active.id} />
                  <MetricHistoryChart metricHistory={active.metricHistory} />
                </ChartGrid>
                {Object.entries(active.metrics).length ? (
                  <KeyValues>
                    {Object.entries(active.metrics).map(([key, value]) => {
                      const published = evidence.some((item) => item.metric === `${key}=${String(value)}`);
                      return (
                        <KeyValue key={key}>
                          <strong>{key}</strong>
                          <span>{String(value)}</span>
                          <DefaultButton
                            $variant={published ? undefined : "outline"}
                            data-testid="publish-metric-evidence"
                            disabled={published}
                            type="button"
                            onClick={() => publishMetric(key, value)}
                          >
                            {published ? "Published" : "Publish evidence"}
                          </DefaultButton>
                        </KeyValue>
                      );
                    })}
                  </KeyValues>
                ) : (
                  <Hint>No metrics recorded yet.</Hint>
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
                  <div>
                    <DefaultButton $variant="outline" type="submit">
                      Add metric
                    </DefaultButton>
                  </div>
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
                        <DefaultButton
                          $variant="outline"
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
                        </DefaultButton>
                      </KeyValue>
                    ))}
                  </KeyValues>
                ) : (
                  <Hint>No parameters recorded yet.</Hint>
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
                  <div>
                    <DefaultButton $variant="outline" type="submit">
                      Add parameter
                    </DefaultButton>
                  </div>
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
                  <Hint>No datasets recorded yet.</Hint>
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
                  <div>
                    <DefaultButton $variant="outline" type="submit">
                      Add dataset
                    </DefaultButton>
                  </div>
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
                        <DefaultButton
                          $variant="outline"
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
                        </DefaultButton>
                      </KeyValue>
                    ))}
                  </KeyValues>
                ) : (
                  <Hint>No result artifacts attached yet.</Hint>
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
                  <div>
                    <DefaultButton $variant="outline" type="submit">
                      Attach artifact
                    </DefaultButton>
                  </div>
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
                    <KeyValues style={{ marginTop: "16px" }}>
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
        </Content>
      </Main>

      <Rail>
        <RailHeader>
          <RailTitle>Evidence → paper</RailTitle>
        </RailHeader>
        {active ? (
          <>
            <RailNote>{active.notes || "This run has no research notes yet."}</RailNote>
            <RailBody>
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
            </RailBody>
            {!evidence.length && <RailEmpty>Complete the run, then turn a metric or artifact into evidence for the manuscript.</RailEmpty>}
            <RailBody>
              {affectedObjects.map((object) => (
                <ImpactItem
                  key={object.id}
                  type="button"
                  onClick={() => {
                    editorState.workspaceView.value = "paper";
                    editorState.integrityPanelOpen.value = true;
                  }}
                >
                  <Tag $status={object.verificationState}>{object.verificationState}</Tag>
                  <ListMeta>
                    {object.kind} · {object.text}
                  </ListMeta>
                </ImpactItem>
              ))}
            </RailBody>
          </>
        ) : (
          <RailEmpty>Select a run to trace what it produced and where the paper uses it.</RailEmpty>
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
          <RailTitle>{data.evidence.length} research results</RailTitle>
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
                <ListTitle>{item.label}</ListTitle>
                <ListMeta>
                  <Tag $status={item.supersededByEvidenceId ? "superseded" : "current"}>{item.supersededByEvidenceId ? "older" : "current"}</Tag>
                  <span>
                    {item.metric || item.type} · {item.experimentId || "manual evidence"}
                  </span>
                </ListMeta>
              </ListItem>
            ))}
          </List>
        ) : (
          <RailEmpty>Experiments produce evidence. Complete a run and publish a metric or artifact here.</RailEmpty>
        )}
      </Rail>

      <Main>
        <Content>
          <Heading>{active?.label || "The bridge between runs and writing"}</Heading>
          <Intro>
            Evidence is the durable research fact the paper depends on. It retains the run, artifact, configuration, and commit that produced it.
          </Intro>
          {active && (
            <>
              <Summary>
                <PropertyRow>
                  <dt>Kind</dt>
                  <dd>{active.evidenceKind || evidenceKindForType(active.type)}</dd>
                </PropertyRow>
                <PropertyRow>
                  <dt>Research value</dt>
                  <dd>{active.metric || active.value ? <Mono>{active.metric || active.value}</Mono> : "—"}</dd>
                </PropertyRow>
                <PropertyRow>
                  <dt>Paper uses</dt>
                  <dd>{linkedObjects.length}</dd>
                </PropertyRow>
                <PropertyRow>
                  <dt>Run</dt>
                  <dd>{run?.name || active.experimentId || "Manual"}</dd>
                </PropertyRow>
                <PropertyRow>
                  <dt>Commit</dt>
                  <dd>{active.commit || run?.sourceCommit ? <Mono>{active.commit || run?.sourceCommit}</Mono> : "—"}</dd>
                </PropertyRow>
                <PropertyRow>
                  <dt>Artifact</dt>
                  <dd>{active.uri || active.artifactId ? <Mono>{active.uri || active.artifactId}</Mono> : "—"}</dd>
                </PropertyRow>
              </Summary>
              <Path>
                <PathStep>
                  <strong>RUN</strong>
                  {run?.name || active.experimentId || "Manual record"}
                </PathStep>
                <PathStep>
                  <strong>EVIDENCE</strong>
                  {active.metric || active.label}
                </PathStep>
                <PathStep>
                  <strong>PAPER</strong>
                  {linkedObjects.length ? linkedObjects.map((item) => `${item.kind}: ${item.text}`).join(" · ") : "Not used yet"}
                </PathStep>
              </Path>

              <Section>
                <SectionTitle>Use this result in the paper</SectionTitle>
                <ButtonRow>
                  <DefaultButton
                    $variant="primary"
                    data-testid="create-linked-claim"
                    type="button"
                    onClick={() => createPaperObject(editorState, provenance, active, "claim")}
                  >
                    Create linked claim
                  </DefaultButton>
                  <DefaultButton $variant="outline" type="button" onClick={() => createPaperObject(editorState, provenance, active, "table")}>
                    Create table
                  </DefaultButton>
                  <DefaultButton
                    $variant="outline"
                    type="button"
                    disabled={!active.uri}
                    onClick={() => createPaperObject(editorState, provenance, active, "figure")}
                  >
                    Associate figure
                  </DefaultButton>
                  <DefaultButton $variant="outline" type="button" onClick={() => createPaperObject(editorState, provenance, active, "method")}>
                    Link methodology
                  </DefaultButton>
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
                  <div>
                    <DefaultButton $variant="outline" type="submit" disabled={!targetObjectId}>
                      Link existing object
                    </DefaultButton>
                  </div>
                </Form>
              </Section>
            </>
          )}
        </Content>
      </Main>

      <Rail>
        <RailHeader>
          <RailTitle>Origin & manuscript usage</RailTitle>
        </RailHeader>
        <RailBody>
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
              <Tag $status={object.verificationState}>{object.verificationState}</Tag>
              <ListMeta>
                {object.kind} · {object.text}
              </ListMeta>
            </ImpactItem>
          ))}
        </RailBody>
        {!linkedObjects.length && (
          <RailEmpty>This result is not used in the manuscript yet. Choose an action in the center pane to create the first connection.</RailEmpty>
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

  useEffect(() => {
    const allowEmpty = new URLSearchParams(window.location.search).get("empty") === "true";
    const isEmpty = !data.experiments.length && !data.objects.length && !data.evidence.length && !data.links.length;
    const isPreviousDemo =
      (!!data.demoProject && data.demoProject !== "gpt6-astra-v5") ||
      data.experiments.some((run) => run.id.startsWith("audio-run-")) ||
      (!data.demoProject && data.experiments.length > 0 && data.experiments.every((run) => run.id.startsWith("stress-run-")));
    const source = editorState.editorView.value?.state.doc.toString() || editorState.text.text.value || "";
    const isPreviousManuscript = source.includes("Regime-Aware Volatility Forecasting");
    const isLegacyCanopySoundManuscript = source.includes("# CanopySound Bird Call Classification");
    const isCanopySoundManuscript = source.includes("# CanopySound: Domain-Robust Bioacoustic Classification");
    const isAstraManuscript = source.includes("# Making of GPT-6 Astra");
    if (
      !allowEmpty &&
      (isPreviousDemo || (isEmpty && (isAstraManuscript || isCanopySoundManuscript || isLegacyCanopySoundManuscript || isPreviousManuscript)))
    ) {
      const manuscript =
        (isPreviousManuscript || isLegacyCanopySoundManuscript || isCanopySoundManuscript) && window.__demoResearchText
          ? window.__demoResearchText
          : source;
      if (manuscript !== source && editorState.editorView.value) {
        editorState.editorView.value.dispatch({ changes: { from: 0, to: source.length, insert: manuscript } });
      }
      provenance.replaceData(buildDemoResearchProject(manuscript));
      editorState.activeExperimentId.value = "astra-run-254";
    }
    // This migration intentionally runs once: later graph edits must never trigger a demo reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Shell>
      <Lifecycle aria-label="Research lifecycle">
        <Step
          $active={view === "experiments"}
          aria-current={view === "experiments" ? "page" : undefined}
          data-testid="nav-experiments"
          type="button"
          onClick={() => (editorState.workspaceView.value = "experiments")}
        >
          Experiments <Count>{data.experiments.length}</Count>
        </Step>
        <Step
          $active={view === "evidence"}
          aria-current={view === "evidence" ? "page" : undefined}
          data-testid="nav-evidence"
          type="button"
          onClick={() => (editorState.workspaceView.value = "evidence")}
        >
          Evidence <Count>{data.evidence.length}</Count>
        </Step>
        <Step
          $active={view === "paper"}
          aria-current={view === "paper" ? "page" : undefined}
          data-testid="nav-paper"
          type="button"
          onClick={() => (editorState.workspaceView.value = "paper")}
        >
          Paper
        </Step>
      </Lifecycle>
      <Viewport>
        <ViewLayer $hidden={view !== "paper"}>{children}</ViewLayer>
        <ViewLayer $hidden={view !== "experiments"}>{view === "experiments" && <ExperimentsWorkspace provenance={provenance} />}</ViewLayer>
        <ViewLayer $hidden={view !== "evidence"}>{view === "evidence" && <EvidenceWorkspace provenance={provenance} />}</ViewLayer>
      </Viewport>
    </Shell>
  );
}
