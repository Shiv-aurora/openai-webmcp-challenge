const DEMO_TIME = "2026-09-02T12:00:00.000Z";

const sectionAt = (markdown, from) => {
  const headings = [...markdown.slice(0, from).matchAll(/^#{1,6}\s+(.+)$/gm)];
  return headings.at(-1)?.[1]?.trim() || "Front matter";
};

const anchorFor = (markdown, snippet) => {
  const from = markdown.indexOf(snippet);
  if (from < 0) throw new Error(`The demo manuscript is missing: ${snippet}`);
  return { from, to: from + snippet.length, line: markdown.slice(0, from).split("\n").length, sectionTitle: sectionAt(markdown, from), snippet };
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

const history = (values) => values.map((value, index) => ({ step: index + 1, value }));

const run = ({ id, number, name, status = "completed", model, commit, startedAt, completedAt, parameters, metrics, metricHistory = {}, artifacts = [], notes, tags = {}, supersedesRunId = "", supersededByRunId = "" }) => ({
  id,
  name: `Run #${number} · ${name}`,
  status,
  method: model,
  parameters,
  metrics,
  metricHistory,
  datasets: ["astra-pretrain-mixture@4.2", "astra-eval-lock@1"],
  artifacts,
  figures: artifacts.filter((item) => item.type === "figure").map((item) => item.uri),
  notes,
  tags: { project: "gpt6-astra", owner: "fictional-lab", ...tags },
  sourceCommit: commit,
  startedAt,
  completedAt,
  supersedesRunId,
  supersededByRunId,
  createdAt: startedAt,
  updatedAt: DEMO_TIME,
});

export function buildDemoResearchProject(markdown) {
  const experiments = [
    run({
      id: "astra-run-201",
      number: 201,
      name: "dense 34B baseline",
      model: "Dense decoder-only Transformer",
      commit: "72a6c11",
      startedAt: "2026-08-11T08:12:00.000Z",
      completedAt: "2026-08-11T18:41:00.000Z",
      parameters: { architecture: "dense-34b", sequence_length: 8192, learning_rate: "3e-4", batch_tokens: "4M", seed: 17 },
      metrics: { reasoning_index: 0.638, tool_completion: 0.581, retrieval_128k: 0.714, hallucination_rate: 0.127, tokens_per_second: 91 },
      metricHistory: { reasoning_index: history([0.412, 0.493, 0.548, 0.589, 0.617, 0.638]), training_loss: history([3.21, 2.79, 2.53, 2.31, 2.19, 2.12]) },
      artifacts: [{ id: "dense-checkpoint", label: "Dense baseline checkpoint", type: "model", uri: "demo-research/models/astra-dense-34b.safetensors" }],
      notes: "Reference dense model used to normalize capability per active parameter.",
      tags: { stage: "baseline" },
    }),
    run({
      id: "astra-run-212",
      number: 212,
      name: "router temperature sweep",
      status: "failed",
      model: "Sparse MoE, aggressive routing",
      commit: "a1d09ef",
      startedAt: "2026-08-14T06:20:00.000Z",
      completedAt: "2026-08-14T09:07:00.000Z",
      parameters: { experts: 16, active_experts: 2, router_temperature: 0.3, balance_loss: 0.001, learning_rate: "2.4e-4", seed: 17 },
      metrics: { reasoning_index: 0.517, expert_concentration: 0.61, router_entropy: 0.84, training_loss: 2.48 },
      metricHistory: { reasoning_index: history([0.451, 0.503, 0.535, 0.517]), router_entropy: history([2.61, 2.18, 1.41, 0.84]) },
      artifacts: [{ id: "router-collapse-log", label: "Expert-collapse trace", type: "log", uri: "demo-research/logs/astra-router-collapse.txt" }],
      notes: "Stopped after three experts absorbed 61% of tokens. The benchmark screenshot looked great; the router did not.",
      tags: { stage: "routing", failure: "expert-collapse" },
    }),
    run({
      id: "astra-run-226",
      number: 226,
      name: "balanced MoE pretraining",
      model: "126B sparse MoE · 31B active",
      commit: "b8fc204",
      startedAt: "2026-08-18T04:15:00.000Z",
      completedAt: "2026-08-19T01:44:00.000Z",
      parameters: { experts: 16, active_experts: 2, balance_loss: 0.01, z_loss: 0.001, sequence_length: 8192, learning_rate: "2.4e-4", seed: 17 },
      metrics: { reasoning_index: 0.711, tool_completion: 0.663, router_entropy: 2.42, tokens_per_second: 74, training_loss: 1.97 },
      metricHistory: { reasoning_index: history([0.489, 0.556, 0.612, 0.658, 0.689, 0.711]), training_loss: history([3.06, 2.61, 2.34, 2.17, 2.05, 1.97]) },
      artifacts: [{ id: "moe-checkpoint", label: "Balanced MoE checkpoint", type: "model", uri: "demo-research/models/astra-moe-126b.safetensors" }],
      notes: "Load-balancing restores expert diversity while retaining the sparse-compute advantage.",
      tags: { stage: "pretraining" },
    }),
    run({
      id: "astra-run-239",
      number: 239,
      name: "long-context curriculum",
      status: "superseded",
      model: "Astra MoE · 8k→64k→256k",
      commit: "d9a42c7",
      startedAt: "2026-08-22T07:30:00.000Z",
      completedAt: "2026-08-23T04:12:00.000Z",
      parameters: { context_schedule: "8k,64k,256k", position_balancing: true, learning_rate: "8e-5", seed: 17 },
      metrics: { reasoning_index: 0.769, tool_completion: 0.812, retrieval_128k: 0.926, hallucination_rate: 0.071, tokens_per_second: 61 },
      metricHistory: { reasoning_index: history([0.631, 0.674, 0.708, 0.734, 0.754, 0.769]), retrieval_128k: history([0.312, 0.487, 0.664, 0.801, 0.881, 0.926]) },
      artifacts: [{ id: "astra-eval-v1", label: "Astra candidate evaluation", type: "result", uri: "demo-research/results/astra-eval-v1.json" }],
      notes: "First paper candidate. Preserved as the manuscript baseline before execution-grounded post-training.",
      tags: { stage: "candidate" },
      supersededByRunId: "astra-run-254",
    }),
    run({
      id: "astra-run-248",
      number: 248,
      name: "execution-grounded post-training",
      model: "Astra MoE + tool trajectory DPO",
      commit: "e11bc92",
      startedAt: "2026-08-27T10:10:00.000Z",
      completedAt: "2026-08-28T02:37:00.000Z",
      parameters: { objective: "sft+dpo", tool_trajectories: 186400, beta: 0.1, learning_rate: "2e-5", seed: 17 },
      metrics: { reasoning_index: 0.776, tool_completion: 0.839, retrieval_128k: 0.944, hallucination_rate: 0.061, calibration_error: 0.043 },
      metricHistory: { reasoning_index: history([0.742, 0.751, 0.759, 0.766, 0.772, 0.776]), tool_completion: history([0.701, 0.748, 0.782, 0.808, 0.826, 0.839]) },
      artifacts: [{ id: "tool-ablation", label: "Execution-feedback ablation", type: "table", uri: "demo-research/tables/tool-feedback-ablation.csv" }],
      notes: "Sandbox execution feedback lowers plausible-but-wrong tool outputs without erasing general reasoning gains.",
      tags: { stage: "post-training" },
    }),
    run({
      id: "astra-run-254",
      number: 254,
      name: "locked Astra evaluation",
      model: "GPT-6 Astra research candidate",
      commit: "f6a57aa",
      startedAt: "2026-09-01T05:25:00.000Z",
      completedAt: "2026-09-01T11:52:00.000Z",
      parameters: { checkpoint: "astra-254", harness: "astra-eval-lock@1", posttrain_learning_rate: "2e-5", temperature: 0, seed: 29 },
      metrics: { reasoning_index: 0.784, tool_completion: 0.847, retrieval_128k: 0.951, hallucination_rate: 0.058, calibration_error: 0.039, tokens_per_second: 59 },
      metricHistory: { reasoning_index: history([0.702, 0.728, 0.746, 0.759, 0.769, 0.776, 0.781, 0.784]), tool_completion: history([0.692, 0.731, 0.768, 0.794, 0.817, 0.831, 0.841, 0.847]) },
      artifacts: [
        { id: "astra-locked-eval", label: "Locked Astra evaluation", type: "result", uri: "demo-research/results/astra-eval-v2.json" },
        { id: "astra-evaluation-figure", label: "Capability and reliability figure", type: "figure", uri: "demo/astra-evaluation-v2.svg" },
        { id: "astra-model-card", label: "Fictional research model card", type: "document", uri: "demo-research/models/astra-model-card.md" },
        { id: "astra-eval-code", label: "Frozen evaluation harness", type: "code", uri: "demo-research/scripts/evaluate_astra.py" },
      ],
      notes: "Frozen evaluation of the post-trained checkpoint. Supersedes #239 and backs the current evidence graph.",
      tags: { stage: "locked-eval", disclosure: "fictional" },
      supersedesRunId: "astra-run-239",
    }),
  ];

  const sweepSpecs = [
    [204, "GQA head-ratio sweep", "Dense 34B · grouped-query attention", "completed", 0.651, 0.594, 0.721, "attention"],
    [207, "code-heavy mixture v1", "Dense 34B · code upweight 1.7×", "superseded", 0.667, 0.632, 0.703, "data-mixture"],
    [209, "math-heavy mixture v2", "Dense 34B · math upweight 2.1×", "completed", 0.681, 0.601, 0.696, "data-mixture"],
    [214, "router z-loss ablation", "Sparse MoE · no router z-loss", "failed", 0.548, 0.577, 0.688, "routing"],
    [216, "top-1 expert routing", "126B MoE · 18B active", "completed", 0.684, 0.617, 0.742, "routing"],
    [219, "top-4 expert routing", "126B MoE · 52B active", "superseded", 0.719, 0.656, 0.751, "routing"],
    [222, "expert capacity 1.10", "126B MoE · capacity constrained", "failed", 0.603, 0.589, 0.731, "routing"],
    [229, "64k continuation, naive", "Astra MoE · rotary extrapolation", "completed", 0.724, 0.691, 0.784, "long-context"],
    [231, "64k position-balanced", "Astra MoE · balanced positions", "completed", 0.741, 0.714, 0.861, "long-context"],
    [234, "128k retrieval curriculum", "Astra MoE · retrieval continuation", "completed", 0.752, 0.739, 0.903, "long-context"],
    [237, "256k batch-size recovery", "Astra MoE · gradient accumulation", "failed", 0.716, 0.702, 0.874, "long-context"],
    [241, "instruction SFT v1", "Astra MoE + supervised fine-tuning", "superseded", 0.758, 0.748, 0.918, "post-training"],
    [243, "reasoning trace filter", "Astra MoE + verified reasoning traces", "completed", 0.771, 0.763, 0.921, "post-training"],
    [245, "preference beta sweep", "Astra MoE + DPO β=0.05", "completed", 0.768, 0.794, 0.919, "post-training"],
    [246, "preference beta 0.20", "Astra MoE + DPO β=0.20", "failed", 0.739, 0.806, 0.906, "post-training"],
    [249, "browser trajectory replay", "Astra MoE + browser tool replay", "completed", 0.779, 0.842, 0.946, "tools"],
    [250, "tool-call penalty ablation", "Astra MoE · no unnecessary-call penalty", "completed", 0.773, 0.816, 0.943, "tools"],
    [251, "calibration temperature fit", "Astra MoE · held-out calibration", "completed", 0.778, 0.841, 0.947, "calibration"],
    [252, "safety refusal balance", "Astra MoE · policy mixture sweep", "running", 0.761, 0.823, 0.939, "alignment"],
    [253, "contamination audit rerun", "Frozen Astra evaluator", "completed", 0.781, 0.845, 0.949, "evaluation"],
    [256, "quantized serving probe", "Astra MoE · FP8 serving candidate", "planned", null, null, null, "serving"],
    [258, "speculative decoding draft", "Astra MoE + 3B draft model", "planned", null, null, null, "serving"],
  ];

  const sweepRuns = sweepSpecs.map(([number, name, model, status, reasoning, tools, retrieval, stage], index) => {
    const hasMetrics = Number.isFinite(reasoning);
    const day = String(12 + (index % 18)).padStart(2, "0");
    const metrics = hasMetrics
      ? {
          reasoning_index: reasoning,
          tool_completion: tools,
          retrieval_128k: retrieval,
          hallucination_rate: Number(Math.max(0.055, 0.15 - reasoning * 0.11).toFixed(3)),
          tokens_per_second: 58 + ((index * 7) % 31),
        }
      : {};
    return run({
      id: `astra-run-${number}`,
      number,
      name,
      status,
      model,
      commit: `${(0x91ab20 + number * 7919).toString(16).slice(0, 7)}`,
      startedAt: `2026-08-${day}T${String(5 + (index % 11)).padStart(2, "0")}:20:00.000Z`,
      completedAt: ["planned", "running"].includes(status) ? "" : `2026-08-${day}T${String(9 + (index % 11)).padStart(2, "0")}:48:00.000Z`,
      parameters: {
        sweep_group: stage,
        learning_rate: index < 7 ? "2.4e-4" : index < 12 ? "8e-5" : "2e-5",
        global_batch_tokens: `${4 + (index % 4)}M`,
        seed: [11, 17, 23, 29][index % 4],
        checkpoint_interval: 500,
      },
      metrics,
      metricHistory: hasMetrics
        ? {
            reasoning_index: history([reasoning - 0.094, reasoning - 0.061, reasoning - 0.036, reasoning - 0.017, reasoning]),
            training_loss: history([2.63, 2.39 - index * 0.006, 2.21 - index * 0.004, 2.08 - index * 0.003, 1.99 - index * 0.002]),
          }
        : {},
      artifacts: status === "failed"
        ? [{ id: `failure-${number}`, label: `${name} failure trace`, type: "log", uri: `demo-research/logs/astra-run-${number}.txt` }]
        : status === "planned"
          ? []
          : [{ id: `scorecard-${number}`, label: `${name} scorecard`, type: "result", uri: `demo-research/results/astra-run-${number}.json` }],
      notes:
        status === "failed"
          ? "Stopped by the automated run-health gate; failure artifacts and partial metrics were retained for diagnosis."
          : status === "planned"
            ? "Queued behind the locked evaluation so serving work cannot mutate the research checkpoint."
            : status === "running"
              ? "Active sweep. Intermediate metrics are visible but are not eligible to support manuscript claims."
              : "Controlled branch from the Astra training graph with immutable configuration and evaluation outputs.",
      tags: { stage, sweep: `astra-${stage}`, priority: index % 3 === 0 ? "high" : "normal" },
    });
  });
  experiments.push(...sweepRuns);
  experiments.sort((left, right) => Number(left.name.match(/#(\d+)/)?.[1]) - Number(right.name.match(/#(\d+)/)?.[1]));

  const e = (id, type, kind, label, artifactId, experimentId, commit, metric, value, uri, notes) => ({ id, type, evidenceKind: kind, label, artifactId, experimentId, commit, metric, value, uri, notes, createdAt: DEMO_TIME, updatedAt: DEMO_TIME });
  const evidence = [
    e("astra-evidence-eval-v2", "experiment-result", "quantitative-result", "Locked Astra scorecard", "astra-locked-eval", "astra-run-254", "f6a57aa", "reasoning_index=78.4%", "78.4%", "demo-research/results/astra-eval-v2.json", "Frozen aggregate from math, code repair, grounded browser tasks, and retrieval."),
    e("astra-evidence-data", "dataset", "quantitative-result", "Astra pretraining manifest", "astra-pretrain-mixture@4.2", "astra-run-226", "b8fc204", "deduplicated_tokens=2.4T", "2.4T", "demo-research/data/astra-pretrain-manifest.json", "Synthetic token mixture, filters, licenses, and contamination audit."),
    e("astra-evidence-config-v2", "configuration", "methodological-configuration", "Locked post-training configuration", "astra-posttrain-config-v2", "astra-run-254", "f6a57aa", "learning_rate=2e-5", "2e-5", "demo-research/configs/astra-posttrain-v2.yaml", "Exact optimizer and execution-feedback configuration for the locked checkpoint."),
    e("astra-evidence-table-v2", "table-source", "table-generating-result", "Astra model comparison", "astra-comparison-v2", "astra-run-254", "f6a57aa", "baseline=63.8%; final=78.4%", "78.4%", "demo-research/tables/astra-comparison-v2.csv", "Cross-run scorecard generated from the experiment registry."),
    e("astra-evidence-figure-v2", "figure-source", "figure-generating-result", "Astra evaluation figure", "astra-evaluation-figure", "astra-run-254", "f6a57aa", "reasoning_index=78.4%", "78.4%", "demo/astra-evaluation-v2.svg", "Regenerated from the locked scorecard."),
    e("astra-evidence-reasoning", "experiment-result", "quantitative-result", "Locked reasoning index", "astra-locked-eval", "astra-run-254", "f6a57aa", "reasoning_index=78.4%", "78.4%", "demo-research/results/astra-eval-v2.json", "The locked harness supersedes the 76.9% manuscript candidate."),
    e("astra-evidence-ablation", "analysis-artifact", "quantitative-result", "Execution-feedback ablation", "tool-ablation", "astra-run-248", "e11bc92", "tool_completion_delta=9.6pp", "9.6pp", "demo-research/tables/tool-feedback-ablation.csv", "Controlled removal of sandbox execution feedback."),
    e("astra-evidence-model", "implementation", "implementation", "Astra research model card", "astra-model-card", "astra-run-254", "f6a57aa", "sha256=6a57…a57a", "6a57…a57a", "demo-research/models/astra-model-card.md", "Synthetic model identity, limitations, and disclosure."),
    e("astra-evidence-code", "evaluation-script", "implementation", "Frozen Astra evaluation harness", "astra-eval-code", "astra-run-254", "f6a57aa", "protocol=astra-eval-lock@1", "astra-eval-lock@1", "demo-research/scripts/evaluate_astra.py", "Deterministic entry point with immutable prompt hashes."),
    e("astra-evidence-failure", "result-file", "negative-result", "Router collapse trace", "router-collapse-log", "astra-run-212", "a1d09ef", "expert_concentration=61%", "61%", "demo-research/logs/astra-router-collapse.txt", "Preserved negative result from the aggressive router-temperature sweep."),
  ];

  const snippets = {
    claim: "76.9% on the Astra Reasoning Index",
    data: "2.4 trillion deduplicated tokens",
    method: "GPT-6 Astra is optimized with AdamW using a peak learning rate of **2.4e-4**.",
    table: "| Model | Reasoning index | Tool completion | 128k retrieval |\n| --- | ---: | ---: | ---: |\n| Dense 34B baseline | 63.8% | 58.1% | 71.4% |\n| Astra MoE candidate | 76.9% | 81.2% | 92.6% |",
    figure: "![GPT-6 Astra evaluation](demo/astra-evaluation-v1.svg)",
  };
  const refs = Object.fromEntries(evidence.map((item) => [item.id, evidenceReference(item, "supports")]));
  const objects = [
    {
      id: "astra-object-result-claim", kind: "claim", subtype: "quantitative-result", text: snippets.claim, anchor: anchorFor(markdown, snippets.claim), verificationState: "contradicted", createdAt: DEMO_TIME, updatedAt: DEMO_TIME,
      verification: verification("contradicted", "contradicted", "The manuscript reports 76.9%, while the locked Astra evaluation reports 78.4%.", [{ ...refs["astra-evidence-reasoning"], metric: "reasoning_index=76.9%", commit: "d9a42c7", experimentId: "astra-run-239" }]),
    },
    {
      id: "astra-object-data-claim", kind: "claim", subtype: "quantitative-result", text: snippets.data, anchor: anchorFor(markdown, snippets.data), verificationState: "verified", createdAt: DEMO_TIME, updatedAt: DEMO_TIME,
      verification: verification("verified", "verified", "The manuscript count matches the versioned synthetic data manifest.", [refs["astra-evidence-data"]]),
    },
    {
      id: "astra-object-method", kind: "method", subtype: null, text: snippets.method, anchor: anchorFor(markdown, snippets.method), verificationState: "stale", createdAt: DEMO_TIME, updatedAt: DEMO_TIME,
      verification: verification("stale", "stale", "The locked post-training configuration uses 2e-5 rather than the pretraining peak.", [{ ...refs["astra-evidence-config-v2"], artifactId: "astra-pretrain-config-v1", commit: "d9a42c7", metric: "learning_rate=2.4e-4", uri: "demo-research/configs/astra-pretrain-v1.yaml" }]),
    },
    {
      id: "astra-object-table", kind: "table", subtype: null, text: snippets.table, anchor: anchorFor(markdown, snippets.table), verificationState: "stale", createdAt: DEMO_TIME, updatedAt: DEMO_TIME,
      verification: verification("stale", "stale", "The comparison table predates post-training and the locked evaluation.", [{ ...refs["astra-evidence-table-v2"], artifactId: "astra-comparison-v1", commit: "d9a42c7", metric: "baseline=63.8%; candidate=76.9%", uri: "demo-research/tables/astra-comparison-v1.csv" }]),
    },
    {
      id: "astra-object-figure", kind: "figure", subtype: null, text: snippets.figure, anchor: anchorFor(markdown, snippets.figure), verificationState: "stale", createdAt: DEMO_TIME, updatedAt: DEMO_TIME,
      verification: verification("stale", "stale", "The displayed figure predates the locked replacement run.", [{ ...refs["astra-evidence-figure-v2"], artifactId: "astra-evaluation-v1", commit: "d9a42c7", metric: "reasoning_index=76.9%", uri: "demo/astra-evaluation-v1.svg" }]),
    },
  ];
  const relationByObject = {
    "astra-object-result-claim": ["astra-evidence-reasoning", "supports"],
    "astra-object-data-claim": ["astra-evidence-data", "supports"],
    "astra-object-method": ["astra-evidence-config-v2", "describes"],
    "astra-object-table": ["astra-evidence-table-v2", "derived-from"],
    "astra-object-figure": ["astra-evidence-figure-v2", "produces"],
  };
  const links = objects.map((object) => ({ id: `astra-link-${object.id}`, objectId: object.id, evidenceId: relationByObject[object.id][0], relation: relationByObject[object.id][1], createdAt: DEMO_TIME, updatedAt: DEMO_TIME }));
  return { version: 2, demoProject: "gpt6-astra-v2", experiments, objects, evidence, links, diffReviews: {} };
}
