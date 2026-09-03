# WebMCP contract

The application registers 36 tools through the current `document.modelContext.registerTool(tool, { signal })` surface. All researcher-authored experiment, evidence, and manuscript data is marked with `untrustedContentHint`. Read tools use `readOnlyHint: true`; navigation and state-changing tools use `readOnlyHint: false`.

## Read tools

- `get_current_selection`
- `get_manuscript_context`
- `get_claim`
- `get_figure`
- `get_table`
- `get_current_section`
- `get_provenance`
- `get_integrity_status`
- `get_navigation_targets`
- `get_research_diffs`
- `get_experiments`
- `get_experiment`
- `compare_experiments`
- `get_evidence_catalog`

## Action and review tools

- `create_claim`
- `attach_evidence`
- `update_evidence`
- `verify_claim`
- `record_verification_result`
- `set_verification_state`
- `propose_claim_change`
- `insert_comment`
- `replace_selected_content`
- `navigate_to_object`
- `stage_research_diff`
- `review_research_diff`
- `navigate_to_research_diff`

## Experiment and evidence actions

- `create_experiment`
- `update_experiment`
- `add_experiment_metric`
- `add_experiment_parameter`
- `attach_experiment_artifact`
- `set_experiment_status`
- `supersede_experiment`
- `create_experiment_evidence`
- `link_evidence_to_manuscript`

## Safety rules

- Claim creation and text replacement require the exact text the agent previously read. Stale selections fail with structured errors.
- Reviewed verification states require linked evidence.
- External verification evidence IDs must belong to the selected claim.
- Deterministic verification refuses ambiguous values, conflicting evidence, and incompatible units.
- Agent conclusions never rewrite manuscript text.
- Replacements and Research Diff corrections are staged as CriticMarkup and require visible researcher acceptance.
- Comments are additive; navigation does not alter manuscript or provenance content.
- Missing selections, objects, evidence, and diff IDs return explicit error codes rather than silently no-oping.
- Superseding a run marks manuscript objects that depend on its evidence stale.
- Publishing replacement evidence can rewire an existing provenance link and create a Research Diff, but it never rewrites manuscript text.

## Validation

The Playwright harness supplies the draft browser API and invokes the same registered tool objects as an external agent. Tests cover registration metadata, successful calls, missing/stale context, evidence gating, conflicting evidence, non-mutating navigation, review-only writes, additive comments, diff decisions, and shared UI/tool state.

The implementation is exercised through the browser harness against all 36 registered tools. Lifecycle tests create and compare runs, publish replacement evidence, connect it to a claim, and verify that a Research Diff appears while the manuscript text remains unchanged.

The WebMCP browser API is an evolving draft. The implementation was checked against the [W3C Community Group draft](https://webmachinelearning.github.io/webmcp/) and its [canonical specification source](https://github.com/webmachinelearning/webmcp/blob/main/index.bs).
