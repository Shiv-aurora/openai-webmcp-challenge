# Phase 5 — Verify This

Phase 5 adds one deterministic verification workflow shared by the researcher UI and WebMCP.

## Researcher workflow

1. Select a quantitative claim.
2. Track it and attach structured evidence, or press **Verify This** immediately to receive an honest missing-evidence result.
3. Press **Verify This** to compare the claim with linked evidence metrics.
4. Inspect the persisted outcome, explicit reason, evidence-reference count, and any evidence-backed suggested value in the integrity panel.
5. If text should change, stage it as CriticMarkup and use the editor's existing visible accept/reject review UI.

The verifier compares only one unambiguous numeric value on each side. It supports percentages, grouped numbers, decimals, and scientific notation. Multiple values, incompatible units, conflicting evidence, or evidence without a comparable metric return a review-required result instead of a guess.

Evidence edits automatically make previously verified linked objects stale. Verification records include the outcome, mapped integrity state, reason, time, source, evidence references, and a bounded history, and persist with the provenance object in browser storage.

## WebMCP additions

- `verify_claim` runs the same deterministic comparison used by the human UI.
- `record_verification_result` lets an external research agent persist an evidence-backed conclusion and explicit reason against linked evidence ids.

An external-agent result never changes manuscript text. `propose_claim_change` remains the separate review-only path and inserts CriticMarkup; there is still no WebMCP tool that accepts or rejects consequential manuscript rewrites.

The complete Phase 5 surface has 21 tools: nine read tools and twelve action/review tools.

## Verified cases

- matching claim/evidence values
- mismatched values with an evidence-backed suggested value
- no linked evidence
- linked evidence without a comparable metric
- ambiguous multi-value claims
- conflicting evidence values
- incompatible units
- persisted verification results
- external-agent conclusions synchronized into the human UI
- no manuscript mutation from verification-result recording

Phase 5 passed formatting, lint with zero errors, production build, the real collaboration runtime, and **89/89 Playwright tests** against the production preview.
