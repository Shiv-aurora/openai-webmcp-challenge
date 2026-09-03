# Research WebMCP contract

## Lifecycle mapping

| Experiment event | WebMCP action | Required data |
| --- | --- | --- |
| Run begins | `create_experiment` | name; preferably method, source commit, start time, stable id |
| Metadata changes | `update_experiment` | experiment id and changed fields |
| Parameter is resolved | `add_experiment_parameter` | experiment id, key, exact value |
| Numeric metric is emitted | `log_experiment_metric_point` | experiment id, key, numeric value; step when known |
| Scalar summary is emitted | `add_experiment_metric` | experiment id, key, exact value |
| Output is persisted | `attach_experiment_artifact` | experiment id, label, type, stable URI |
| Run ends | `set_experiment_status` | experiment id and completed or failed status |
| Result becomes citable | `create_experiment_evidence` | experiment id, label, evidence type, metric/value, artifact reference |
| Evidence supports paper content | `link_evidence_to_manuscript` | evidence id, manuscript object id, relation |
| New run replaces old run | `supersede_experiment` | older and newer experiment ids |

## Evidence conventions

- Use `experiment-result` for a standalone reported outcome and `result-file` for its durable output.
- Use `figure-source` or `table-source` when the corresponding artifact is referenced by the paper.
- Use `configuration`, `implementation`, `evaluation-script`, or `dataset` for reproducibility facts rather than performance conclusions.
- Use `analysis-artifact` for failure traces, regressions, collapse analyses, or disproven hypotheses worth retaining.
- Store a machine-readable metric such as `reasoning_index=78.4%` when possible, while keeping the original numeric value in `value`.

## Claim-linking conventions

Read manuscript objects before linking evidence. A link should identify the actual tracked object, not a guessed text fragment.

- `supports`: the evidence directly backs the object.
- `produces`: the experiment output produces the figure, table, or reported object.
- `describes`: the evidence records a method or configuration without independently proving a conclusion.
- `derived-from`: the object is computed or summarized from the evidence.

Contradiction is a verification outcome, not a provenance relation. Link the evidence with the structurally correct relation, then let deterministic verification or researcher review mark the object contradicted.

When newer evidence replaces linked evidence, pass `supersedesEvidenceId` while creating it. This preserves lineage, rewires the evidence relationship, marks affected objects for review, and lets the app generate a Research Diff.

## Completion report

Return a concise sync summary containing:

- experiment id and final status;
- metrics and metric histories recorded;
- artifacts attached;
- evidence created or superseded;
- manuscript objects linked;
- integrity counts and pending Research Diffs;
- any omitted field whose source was unavailable.
