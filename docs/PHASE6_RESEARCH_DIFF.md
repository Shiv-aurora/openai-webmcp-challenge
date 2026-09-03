# Phase 6 — Research Diff

Research Diff is computed from the persisted provenance graph, never from a display-only fixture. `detectResearchDiffs` compares each tracked manuscript object's anchored text and previous verification references with its currently linked evidence.

Supported drift:

- quantitative claims and results;
- method/configuration values;
- table values;
- figure source URIs;
- linked artifact, experiment, commit, metric, and URI identity.

Diff IDs are stable (`research-diff-<object-id>`), grouped by manuscript section, and retain defer/reject/in-review decisions. A single unambiguous value change can produce proposed text. Ambiguous or multi-value evidence remains review-only.

The acceptance boundary is deliberate:

1. **Inspect** navigates to the affected manuscript object.
2. **Accept → review** stages a CriticMarkup proposal; it does not alter the accepted manuscript.
3. The researcher uses the editor's existing visible accept/reject control.
4. After human acceptance, the provenance anchor is reconciled and the object returns to verified state.

WebMCP exposes the same entries with `get_research_diffs`, `navigate_to_research_diff`, `stage_research_diff`, and `review_research_diff`. Agents may defer or reject a diff, but may not accept a manuscript rewrite.
