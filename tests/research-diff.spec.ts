import { expect, test } from "@playwright/test";
import { detectResearchDiffs, groupResearchDiffs } from "../src/integrity/researchDiff";

const baseData = {
  objects: [
    {
      id: "claim-1",
      kind: "claim",
      text: "Accuracy improved by 18.2%.",
      anchor: { from: 20, sectionTitle: "Results" },
      verificationState: "contradicted",
    },
  ],
  evidence: [
    {
      id: "evidence-1",
      label: "results.json",
      type: "experiment-result",
      metric: "accuracy_improvement=16.8%",
      updatedAt: "2026-09-02T00:00:00.000Z",
    },
  ],
  links: [{ objectId: "claim-1", evidenceId: "evidence-1", relation: "supports" }],
  diffReviews: {},
};

test("detects a stable evidence-driven quantitative diff with proposed text", () => {
  const diffs = detectResearchDiffs(baseData as any);
  expect(diffs).toHaveLength(1);
  expect(diffs[0].id).toBe("research-diff-claim-1");
  expect(diffs[0].changes[0]).toMatchObject({ kind: "quantitative-result", before: "18.2%", after: "16.8%" });
  expect(diffs[0].proposedText).toBe("Accuracy improved by 16.8%.");
  expect(groupResearchDiffs(diffs)).toEqual([{ title: "Results", diffs }]);
});

test("uses persisted review decisions without hiding the underlying drift", () => {
  const data = { ...baseData, diffReviews: { "research-diff-claim-1": { status: "deferred", reason: "Awaiting final run" } } };
  const [diff] = detectResearchDiffs(data as any);
  expect(diff.status).toBe("deferred");
  expect(diff.review.reason).toBe("Awaiting final run");
});

test("detects figure source changes from live evidence", () => {
  const data = {
    objects: [
      {
        id: "figure-1",
        kind: "figure",
        text: "![Stress accuracy](figures/stress-v1.svg)",
        anchor: { from: 4, sectionTitle: "Results" },
        verificationState: "stale",
      },
    ],
    evidence: [{ id: "source-1", label: "figure output", type: "figure-source", uri: "figures/stress-v2.svg" }],
    links: [{ objectId: "figure-1", evidenceId: "source-1", relation: "produces" }],
    diffReviews: {},
  };
  const [diff] = detectResearchDiffs(data as any);
  expect(diff.changes[0]).toMatchObject({ kind: "figure", before: "figures/stress-v1.svg", after: "figures/stress-v2.svg" });
  expect(diff.proposedText).toContain("stress-v2.svg");
});
