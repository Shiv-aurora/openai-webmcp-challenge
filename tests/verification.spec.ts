import { expect, test } from "@playwright/test";
import { extractComparableValues, verifyQuantitativeClaim } from "../src/integrity/verification";

const claim = { id: "claim-1", kind: "claim", text: "Accuracy improved by 18.2%.", verificationState: "needs-review" };
const evidence = (metric: string, id = "evidence-1") => [
  {
    link: { relation: "supports" },
    evidence: { id, label: "results.json", type: "experiment-result", metric, updatedAt: "2026-09-02T00:00:00.000Z" },
  },
];

test("parses percentages, grouped numbers, and scientific notation without digits embedded in metric names", () => {
  expect(extractComparableValues("top1_accuracy=18.2%")).toEqual([{ raw: "18.2%", value: 18.2, unit: "percent" }]);
  expect(extractComparableValues("observations=481,000; learning_rate=3e-4")).toEqual([
    { raw: "481,000", value: 481000, unit: "number" },
    { raw: "3e-4", value: 0.0003, unit: "number" },
  ]);
});

test("returns missing evidence instead of inventing a metric", () => {
  const result = verifyQuantitativeClaim(claim, [], { checkedAt: "2026-09-02T00:00:00.000Z" });
  expect(result.outcome).toBe("missing-evidence");
  expect(result.verificationState).toBe("unlinked");
});

test("requires review for ambiguous and conflicting evidence", () => {
  expect(verifyQuantitativeClaim({ ...claim, text: "Accuracy rose from 70% to 80%." }, evidence("accuracy=80%")).outcome).toBe("needs-review");
  expect(verifyQuantitativeClaim(claim, [...evidence("accuracy=18.2%"), ...evidence("accuracy=16.8%", "evidence-2")]).outcome).toBe("needs-review");
});

test("distinguishes matching and contradictory values", () => {
  expect(verifyQuantitativeClaim(claim, evidence("accuracy=18.2%")).outcome).toBe("verified");
  const mismatch = verifyQuantitativeClaim(claim, evidence("accuracy=16.8%"));
  expect(mismatch.outcome).toBe("contradicted");
  expect(mismatch.suggestedValue.raw).toBe("16.8%");
});
