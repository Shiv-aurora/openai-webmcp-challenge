const DEMO_TIME = "2026-09-02T12:00:00.000Z";

const sectionAt = (markdown, from) => {
  const prefix = markdown.slice(0, from);
  const headings = [...prefix.matchAll(/^#{1,6}\s+(.+)$/gm)];
  return headings.at(-1)?.[1]?.trim() || "Front matter";
};

const anchorFor = (markdown, snippet) => {
  const from = markdown.indexOf(snippet);
  if (from < 0) throw new Error(`The demo manuscript is missing: ${snippet}`);
  return {
    from,
    to: from + snippet.length,
    line: markdown.slice(0, from).split("\n").length,
    sectionTitle: sectionAt(markdown, from),
    snippet,
  };
};

const evidenceReference = (evidence, relation, overrides = {}) => ({
  evidenceId: evidence.id,
  label: evidence.label,
  type: evidence.type,
  relation,
  artifactId: evidence.artifactId,
  experimentId: evidence.experimentId,
  commit: evidence.commit,
  metric: evidence.metric,
  uri: evidence.uri,
  updatedAt: evidence.updatedAt,
  ...overrides,
});

const verification = (outcome, state, reason, references) => ({
  outcome,
  verificationState: state,
  reason,
  reasons: [reason],
  checkedAt: "2026-09-01T12:00:00.000Z",
  source: "deterministic-demo",
  evidenceReferences: references,
});

export function buildDemoResearchProject(markdown) {
  const evidence = [
    {
      id: "demo-evidence-stress-v2",
      type: "experiment-result",
      label: "demo-research/results/stress-eval-v2.json",
      artifactId: "stress-eval-v2",
      experimentId: "stress-run-08",
      commit: "7b39d24",
      metric: "stress_accuracy_improvement=16.8%",
      uri: "demo-research/results/stress-eval-v2.json",
      notes: "Locked replacement run. The manuscript still reports the superseded v1 result of 18.2%.",
      createdAt: DEMO_TIME,
      updatedAt: DEMO_TIME,
    },
    {
      id: "demo-evidence-data",
      type: "dataset",
      label: "demo-research/data/dataset-manifest.json",
      artifactId: "market-observations-2026-08",
      experimentId: "",
      commit: "7b39d24",
      metric: "aligned_observations=481000",
      uri: "demo-research/data/dataset-manifest.json",
      notes: "Deterministic aligned row count.",
      createdAt: DEMO_TIME,
      updatedAt: DEMO_TIME,
    },
    {
      id: "demo-evidence-config-v2",
      type: "configuration",
      label: "demo-research/configs/train-v2.yaml",
      artifactId: "training-config-v2",
      experimentId: "stress-run-08",
      commit: "7b39d24",
      metric: "learning_rate=2e-4",
      uri: "demo-research/configs/train-v2.yaml",
      notes: "The current locked run uses 2e-4; the manuscript still describes 3e-4.",
      createdAt: DEMO_TIME,
      updatedAt: DEMO_TIME,
    },
    {
      id: "demo-evidence-table-v2",
      type: "table-source",
      label: "demo-research/tables/evaluation-v2.csv",
      artifactId: "evaluation-table-v2",
      experimentId: "stress-run-08",
      commit: "7b39d24",
      metric: "normal_improvement=5.2%; stress_improvement=16.8%",
      uri: "demo-research/tables/evaluation-v2.csv",
      notes: "The normal row is current; the stress row is stale.",
      createdAt: DEMO_TIME,
      updatedAt: DEMO_TIME,
    },
    {
      id: "demo-evidence-figure-v2",
      type: "figure-source",
      label: "demo-research/figures/stress-regime-accuracy-v2.svg",
      artifactId: "stress-accuracy-figure-v2",
      experimentId: "stress-run-08",
      commit: "7b39d24",
      metric: "stress_accuracy_improvement=16.8%",
      uri: "demo/stress-regime-accuracy-v2.svg",
      notes: "Regenerated from the locked v2 results.",
      createdAt: DEMO_TIME,
      updatedAt: DEMO_TIME,
    },
  ];

  const snippets = {
    claim: "18.2% improvement in stress-regime accuracy",
    data: "481,000 market observations",
    method: "The forecasting model is optimized with AdamW using a learning rate of **3e-4**.",
    table:
      "| Evaluation regime | Baseline accuracy | Proposed accuracy | Relative improvement |\n| --- | ---: | ---: | ---: |\n| Normal | 71.4% | 75.1% | 5.2% |\n| Stress | 59.3% | 70.1% | 18.2% |",
    figure: "![Stress-regime accuracy comparison](demo/stress-regime-accuracy-v1.svg)",
  };

  const refs = Object.fromEntries(evidence.map((item) => [item.id, evidenceReference(item, "supports")]));
  refs["demo-evidence-figure-v2"].relation = "produces";
  refs["demo-evidence-table-v2"].relation = "derived-from";

  const objects = [
    {
      id: "demo-object-stress-claim",
      kind: "claim",
      subtype: "quantitative-result",
      text: snippets.claim,
      anchor: anchorFor(markdown, snippets.claim),
      verificationState: "contradicted",
      createdAt: DEMO_TIME,
      updatedAt: DEMO_TIME,
      verification: verification("contradicted", "contradicted", "The manuscript reports 18.2%, while the locked replacement run reports 16.8%.", [
        {
          ...refs["demo-evidence-stress-v2"],
          artifactId: "stress-eval-v1",
          experimentId: "stress-run-07",
          commit: "28e6a11",
          metric: "stress_accuracy_improvement=18.2%",
        },
      ]),
    },
    {
      id: "demo-object-data-claim",
      kind: "claim",
      subtype: "quantitative-result",
      text: snippets.data,
      anchor: anchorFor(markdown, snippets.data),
      verificationState: "verified",
      createdAt: DEMO_TIME,
      updatedAt: DEMO_TIME,
      verification: verification("verified", "verified", "The manuscript row count matches the checked-in dataset manifest.", [
        refs["demo-evidence-data"],
      ]),
    },
    {
      id: "demo-object-method",
      kind: "method",
      subtype: null,
      text: snippets.method,
      anchor: anchorFor(markdown, snippets.method),
      verificationState: "stale",
      createdAt: DEMO_TIME,
      updatedAt: DEMO_TIME,
      verification: verification("stale", "stale", "The locked training configuration changed from 3e-4 to 2e-4.", [
        {
          ...refs["demo-evidence-config-v2"],
          artifactId: "training-config-v1",
          commit: "28e6a11",
          metric: "learning_rate=3e-4",
          uri: "demo-research/configs/train-v1.yaml",
        },
      ]),
    },
    {
      id: "demo-object-table",
      kind: "table",
      subtype: null,
      text: snippets.table,
      anchor: anchorFor(markdown, snippets.table),
      verificationState: "stale",
      createdAt: DEMO_TIME,
      updatedAt: DEMO_TIME,
      verification: verification("stale", "stale", "The stress row was generated from the superseded v1 result.", [
        {
          ...refs["demo-evidence-table-v2"],
          artifactId: "evaluation-table-v1",
          commit: "28e6a11",
          metric: "normal_improvement=5.2%; stress_improvement=18.2%",
          uri: "demo-research/tables/evaluation-v1.csv",
        },
      ]),
    },
    {
      id: "demo-object-figure",
      kind: "figure",
      subtype: null,
      text: snippets.figure,
      anchor: anchorFor(markdown, snippets.figure),
      verificationState: "stale",
      createdAt: DEMO_TIME,
      updatedAt: DEMO_TIME,
      verification: verification("stale", "stale", "The displayed figure predates the locked replacement run.", [
        {
          ...refs["demo-evidence-figure-v2"],
          artifactId: "stress-accuracy-figure-v1",
          commit: "28e6a11",
          metric: "stress_accuracy_improvement=18.2%",
          uri: "demo/stress-regime-accuracy-v1.svg",
        },
      ]),
    },
  ];

  const relationByObject = {
    "demo-object-stress-claim": ["demo-evidence-stress-v2", "supports"],
    "demo-object-data-claim": ["demo-evidence-data", "supports"],
    "demo-object-method": ["demo-evidence-config-v2", "describes"],
    "demo-object-table": ["demo-evidence-table-v2", "derived-from"],
    "demo-object-figure": ["demo-evidence-figure-v2", "produces"],
  };
  const links = objects.map((object) => ({
    id: `demo-link-${object.id}`,
    objectId: object.id,
    evidenceId: relationByObject[object.id][0],
    relation: relationByObject[object.id][1],
    createdAt: DEMO_TIME,
    updatedAt: DEMO_TIME,
  }));

  return { version: 1, objects, evidence, links, diffReviews: {} };
}
