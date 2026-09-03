import { ensureProvenanceStore, EVIDENCE_TYPES, EXPERIMENT_STATUSES, PROVENANCE_RELATIONS } from "../integrity/provenance";

export const EXPERIMENT_WEBMCP_TOOL_NAMES = [
  "get_experiments",
  "get_experiment",
  "compare_experiments",
  "get_evidence_catalog",
  "create_experiment",
  "update_experiment",
  "add_experiment_metric",
  "add_experiment_parameter",
  "attach_experiment_artifact",
  "set_experiment_status",
  "supersede_experiment",
  "create_experiment_evidence",
  "link_evidence_to_manuscript",
];

const readSignal = (value) => (typeof value?.peek === "function" ? value.peek() : value?.value);
const result = (payload, isError = false) => ({
  content: [{ type: "text", text: JSON.stringify(payload) }],
  structuredContent: payload,
  ...(isError ? { isError: true } : {}),
});
const error = (code, message, details = {}) => result({ ok: false, error: { code, message, ...details } }, true);
const readOnly = { readOnlyHint: true, untrustedContentHint: true };
const mutating = { readOnlyHint: false, untrustedContentHint: true };
const string = (description, maxLength = 300) => ({ type: "string", maxLength, description });

const experimentSnapshot = (data, run) => {
  const evidence = data.evidence.filter((item) => item.experimentId === run.id);
  const evidenceIds = new Set(evidence.map((item) => item.id));
  const objectIds = new Set(data.links.filter((link) => evidenceIds.has(link.evidenceId)).map((link) => link.objectId));
  return {
    ...run,
    evidence,
    manuscriptObjects: data.objects.filter((object) => objectIds.has(object.id)),
  };
};

const compareMaps = (left = {}, right = {}) =>
  [...new Set([...Object.keys(left), ...Object.keys(right)])]
    .filter((key) => String(left[key] ?? "") !== String(right[key] ?? ""))
    .map((key) => ({ key, before: left[key] ?? null, after: right[key] ?? null }));

export function buildExperimentWebMCPTools(editorState) {
  const provenance = ensureProvenanceStore(editorState);
  const data = () => readSignal(provenance.data) || { experiments: [], evidence: [], objects: [], links: [] };
  const findRun = (id) => data().experiments.find((item) => item.id === id);
  const findEvidence = (id) => data().evidence.find((item) => item.id === id);

  return [
    {
      name: "get_experiments",
      title: "List research experiments",
      description: "Return the same persisted experiment runs visible in Potter’s Wheel, optionally filtered by run status.",
      inputSchema: {
        type: "object",
        properties: { status: { type: "string", enum: EXPERIMENT_STATUSES }, limit: { type: "integer", minimum: 1, maximum: 100 } },
        additionalProperties: false,
      },
      annotations: readOnly,
      execute: async (input = {}) => {
        const runs = data().experiments.filter((run) => !input.status || run.status === input.status);
        const limit = Math.min(100, Math.max(1, input.limit || 50));
        return result({ ok: true, experiments: runs.slice(0, limit), total: runs.length, truncated: runs.length > limit });
      },
    },
    {
      name: "get_experiment",
      title: "Get research experiment",
      description: "Return one run with its parameters, metrics, artifacts, produced evidence, and dependent manuscript objects.",
      inputSchema: {
        type: "object",
        properties: { experimentId: string("Experiment run id") },
        required: ["experimentId"],
        additionalProperties: false,
      },
      annotations: readOnly,
      execute: async ({ experimentId } = {}) => {
        const run = findRun(experimentId);
        return run
          ? result({ ok: true, experiment: experimentSnapshot(data(), run) })
          : error("EXPERIMENT_NOT_FOUND", "No experiment exists with that id.", { experimentId });
      },
    },
    {
      name: "compare_experiments",
      title: "Compare research experiments",
      description: "Compare the configuration, metrics, datasets, artifacts, and provenance impact of two experiment runs.",
      inputSchema: {
        type: "object",
        properties: { baseExperimentId: string("Earlier experiment id"), candidateExperimentId: string("Newer experiment id") },
        required: ["baseExperimentId", "candidateExperimentId"],
        additionalProperties: false,
      },
      annotations: readOnly,
      execute: async ({ baseExperimentId, candidateExperimentId } = {}) => {
        const base = findRun(baseExperimentId);
        const candidate = findRun(candidateExperimentId);
        if (!base || !candidate) return error("EXPERIMENT_NOT_FOUND", "Both experiment ids must identify existing runs.");
        return result({
          ok: true,
          base: experimentSnapshot(data(), base),
          candidate: experimentSnapshot(data(), candidate),
          changes: {
            parameters: compareMaps(base.parameters, candidate.parameters),
            metrics: compareMaps(base.metrics, candidate.metrics),
            sourceCommit: base.sourceCommit === candidate.sourceCommit ? null : { before: base.sourceCommit, after: candidate.sourceCommit },
            datasets: { before: base.datasets, after: candidate.datasets },
            artifacts: { before: base.artifacts, after: candidate.artifacts },
          },
        });
      },
    },
    {
      name: "get_evidence_catalog",
      title: "List research evidence",
      description: "Return evidence between experiments and the paper, including its originating run and manuscript usage.",
      inputSchema: {
        type: "object",
        properties: { experimentId: string("Optional originating experiment id"), type: { type: "string", enum: EVIDENCE_TYPES } },
        additionalProperties: false,
      },
      annotations: readOnly,
      execute: async (input = {}) => {
        const current = data();
        const evidence = current.evidence
          .filter((item) => !input.experimentId || item.experimentId === input.experimentId)
          .filter((item) => !input.type || item.type === input.type)
          .map((item) => ({
            ...item,
            experiment: current.experiments.find((run) => run.id === item.experimentId) || null,
            manuscriptObjects: current.links
              .filter((link) => link.evidenceId === item.id)
              .map((link) => current.objects.find((object) => object.id === link.objectId))
              .filter(Boolean),
          }));
        return result({ ok: true, evidence, total: evidence.length });
      },
    },
    {
      name: "create_experiment",
      title: "Create research experiment",
      description: "Create a run in the same Experiments workspace the researcher uses.",
      inputSchema: {
        type: "object",
        properties: {
          id: string("Optional stable run id"),
          name: string("Human-readable run name"),
          status: { type: "string", enum: EXPERIMENT_STATUSES },
          method: string("Model or research method"),
          sourceCommit: string("Source commit", 200),
          notes: string("Research notes", 2000),
          startedAt: string("ISO timestamp"),
        },
        required: ["name"],
        additionalProperties: false,
      },
      annotations: mutating,
      execute: async (input = {}) => {
        const experiment = provenance.createExperiment(input);
        if (!experiment) return error("EXPERIMENT_CREATION_FAILED", "Provide a unique id and non-empty run name.");
        editorState.activeExperimentId.value = experiment.id;
        return result({ ok: true, experiment, workspace: "experiments" });
      },
    },
    {
      name: "update_experiment",
      title: "Update research experiment",
      description: "Update run metadata such as its name, method, notes, timestamps, datasets, or source commit.",
      inputSchema: {
        type: "object",
        properties: {
          experimentId: string("Experiment run id"),
          name: string("Run name"),
          method: string("Model or method"),
          sourceCommit: string("Source commit", 200),
          notes: string("Research notes", 2000),
          datasets: { type: "array", items: { type: "string" }, maxItems: 100 },
          startedAt: string("ISO timestamp"),
          completedAt: string("ISO timestamp"),
        },
        required: ["experimentId"],
        additionalProperties: false,
      },
      annotations: mutating,
      execute: async ({ experimentId, ...patch } = {}) => {
        if (!Object.keys(patch).length) return error("EMPTY_EXPERIMENT_UPDATE", "Provide at least one run field to update.");
        const experiment = provenance.updateExperiment(experimentId, patch);
        return experiment ? result({ ok: true, experiment }) : error("EXPERIMENT_NOT_FOUND", "No experiment exists with that id.", { experimentId });
      },
    },
    {
      name: "add_experiment_metric",
      title: "Log experiment metric",
      description: "Add or update a named metric on a research run.",
      inputSchema: {
        type: "object",
        properties: { experimentId: string("Experiment run id"), key: string("Metric name"), value: {} },
        required: ["experimentId", "key", "value"],
        additionalProperties: false,
      },
      annotations: mutating,
      execute: async ({ experimentId, key, value } = {}) => {
        const experiment = provenance.addExperimentMetric(experimentId, key, value);
        return experiment
          ? result({ ok: true, experiment })
          : error("METRIC_UPDATE_FAILED", "Provide an existing experiment, metric name, and value.");
      },
    },
    {
      name: "add_experiment_parameter",
      title: "Log experiment parameter",
      description: "Add or update a named configuration value on a research run.",
      inputSchema: {
        type: "object",
        properties: { experimentId: string("Experiment run id"), key: string("Parameter name"), value: {} },
        required: ["experimentId", "key", "value"],
        additionalProperties: false,
      },
      annotations: mutating,
      execute: async ({ experimentId, key, value } = {}) => {
        const experiment = provenance.addExperimentParameter(experimentId, key, value);
        return experiment
          ? result({ ok: true, experiment })
          : error("PARAMETER_UPDATE_FAILED", "Provide an existing experiment, parameter name, and value.");
      },
    },
    {
      name: "attach_experiment_artifact",
      title: "Attach experiment artifact",
      description: "Attach a result, figure, table, configuration, or other artifact to a research run.",
      inputSchema: {
        type: "object",
        properties: {
          experimentId: string("Experiment run id"),
          label: string("Artifact label"),
          type: string("Artifact type"),
          uri: string("Artifact URI", 1000),
          id: string("Optional artifact id"),
        },
        required: ["experimentId", "label"],
        additionalProperties: false,
      },
      annotations: mutating,
      execute: async ({ experimentId, ...input } = {}) => {
        const artifact = provenance.attachExperimentArtifact(experimentId, input);
        return artifact
          ? result({ ok: true, artifact, experiment: findRun(experimentId) })
          : error("ARTIFACT_CREATION_FAILED", "Provide an existing experiment and artifact label.");
      },
    },
    {
      name: "set_experiment_status",
      title: "Set experiment status",
      description: "Mark a run planned, running, completed, or failed in the shared experiment workspace.",
      inputSchema: {
        type: "object",
        properties: {
          experimentId: string("Experiment run id"),
          status: { type: "string", enum: ["planned", "running", "completed", "failed"] },
          completedAt: string("Optional ISO completion timestamp"),
        },
        required: ["experimentId", "status"],
        additionalProperties: false,
      },
      annotations: mutating,
      execute: async ({ experimentId, status, completedAt } = {}) => {
        const experiment = provenance.updateExperiment(experimentId, {
          status,
          ...(completedAt ? { completedAt } : status === "completed" ? { completedAt: new Date().toISOString() } : {}),
        });
        return experiment ? result({ ok: true, experiment }) : error("EXPERIMENT_NOT_FOUND", "No experiment exists with that id.", { experimentId });
      },
    },
    {
      name: "supersede_experiment",
      title: "Supersede research experiment",
      description: "Identify a newer run as replacing an earlier run and mark dependent manuscript objects stale for review.",
      inputSchema: {
        type: "object",
        properties: { olderExperimentId: string("Superseded run id"), newerExperimentId: string("Replacement run id") },
        required: ["olderExperimentId", "newerExperimentId"],
        additionalProperties: false,
      },
      annotations: mutating,
      execute: async ({ olderExperimentId, newerExperimentId } = {}) => {
        const supersession = provenance.supersedeExperiment(olderExperimentId, newerExperimentId);
        return supersession
          ? result({ ok: true, ...supersession, integrity: provenance.stats() })
          : error("EXPERIMENT_SUPERSESSION_FAILED", "Both distinct experiment ids must exist.");
      },
    },
    {
      name: "create_experiment_evidence",
      title: "Publish experiment evidence",
      description:
        "Turn a run metric, configuration, result, figure, or table artifact into durable evidence for the paper. A superseded evidence id rewires its manuscript links and creates Research Diffs.",
      inputSchema: {
        type: "object",
        properties: {
          experimentId: string("Originating experiment id"),
          label: string("Evidence label"),
          type: { type: "string", enum: EVIDENCE_TYPES },
          evidenceKind: string("Quantitative result, comparison, methodology, ablation, figure, or table result"),
          metric: string("Machine-readable metric, for example accuracy=17.3%", 500),
          value: {},
          baseline: {},
          artifactId: string("Artifact id"),
          uri: string("Artifact URI", 1000),
          notes: string("Research notes", 2000),
          supersedesEvidenceId: string("Optional older evidence id to replace"),
        },
        required: ["experimentId", "label"],
        additionalProperties: false,
      },
      annotations: mutating,
      execute: async ({ supersedesEvidenceId, ...input } = {}) => {
        const run = findRun(input.experimentId);
        if (!run) return error("EXPERIMENT_NOT_FOUND", "No experiment exists with that id.", { experimentId: input.experimentId });
        if (supersedesEvidenceId && !findEvidence(supersedesEvidenceId))
          return error("EVIDENCE_NOT_FOUND", "The superseded evidence id does not exist.");
        const evidence = provenance.addStandaloneEvidence({ ...input, commit: run.sourceCommit });
        if (!evidence) return error("EVIDENCE_CREATION_FAILED", "Provide a non-empty, unique evidence label.");
        if (supersedesEvidenceId) provenance.supersedeEvidence(supersedesEvidenceId, evidence.id);
        editorState.activeEvidenceId.value = evidence.id;
        return result({ ok: true, evidence: findEvidence(evidence.id), integrity: provenance.stats() });
      },
    },
    {
      name: "link_evidence_to_manuscript",
      title: "Link evidence to manuscript object",
      description: "Connect existing experiment evidence to an existing claim, figure, table, or method in the same visible workspace.",
      inputSchema: {
        type: "object",
        properties: {
          evidenceId: string("Evidence id"),
          objectId: string("Tracked manuscript object id"),
          relation: { type: "string", enum: PROVENANCE_RELATIONS },
        },
        required: ["evidenceId", "objectId"],
        additionalProperties: false,
      },
      annotations: mutating,
      execute: async ({ evidenceId, objectId, relation } = {}) => {
        const link = provenance.linkEvidence(objectId, evidenceId, relation);
        return link
          ? result({ ok: true, link, evidence: findEvidence(evidenceId), integrity: provenance.stats() })
          : error("EVIDENCE_LINK_FAILED", "Both the evidence and manuscript object must exist.");
      },
    },
  ];
}
