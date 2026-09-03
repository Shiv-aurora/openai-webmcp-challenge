const NUMBER_PATTERN = /(?<![\w.])[-+]?(?:\d+(?:,\d{3})*(?:\.\d+)?|\.\d+)(?:e[-+]?\d+)?\s*%?/gi;

const outcomeState = {
  verified: "verified",
  contradicted: "contradicted",
  stale: "stale",
  "missing-evidence": "unlinked",
  "needs-review": "needs-review",
  "partially-supported": "needs-review",
};

export const VERIFICATION_OUTCOMES = Object.keys(outcomeState);

const rounded = (value) => Number(value.toPrecision(12));

export function extractComparableValues(text) {
  return [...String(text || "").matchAll(NUMBER_PATTERN)]
    .map((match) => {
      const raw = match[0].trim();
      const percent = raw.endsWith("%");
      const value = Number(raw.replaceAll(",", "").replace("%", ""));
      if (!Number.isFinite(value)) return null;
      return { raw, value: rounded(value), unit: percent ? "percent" : "number" };
    })
    .filter(Boolean);
}

const referenceFor = ({ link, evidence }) => ({
  evidenceId: evidence.id,
  label: evidence.label,
  type: evidence.type,
  relation: link.relation,
  artifactId: evidence.artifactId || "",
  experimentId: evidence.experimentId || "",
  commit: evidence.commit || "",
  metric: evidence.metric || "",
  uri: evidence.uri || "",
  updatedAt: evidence.updatedAt,
});

const result = (outcome, reason, details = {}) => ({
  outcome,
  verificationState: outcomeState[outcome],
  reason,
  reasons: [reason],
  ...details,
});

const sameValue = (left, right) => left.unit === right.unit && Math.abs(left.value - right.value) <= Math.max(1e-12, Math.abs(left.value) * 1e-9);

export function verifyQuantitativeClaim(object, linkedEvidence, options = {}) {
  const checkedAt = options.checkedAt || new Date().toISOString();
  const source = options.source || "deterministic";
  const evidenceReferences = linkedEvidence.map(referenceFor);
  const base = { checkedAt, source, evidenceReferences };

  if (!object || object.kind !== "claim") {
    return result("needs-review", "Verify This requires a tracked manuscript claim.", base);
  }

  const claimValues = extractComparableValues(object.text);
  if (!linkedEvidence.length) {
    return result("missing-evidence", "No research evidence is linked to this claim, so it cannot be verified.", {
      ...base,
      claimValues,
    });
  }

  if (object.verificationState === "stale" && options.preserveStale) {
    return result("stale", "Linked evidence changed after the previous verification. Review the new evidence before relying on this claim.", {
      ...base,
      claimValues,
    });
  }

  if (claimValues.length !== 1) {
    const reason = claimValues.length
      ? "The claim contains multiple numeric values, so deterministic comparison would be ambiguous."
      : "The claim does not contain a comparable numeric value.";
    return result("needs-review", reason, { ...base, claimValues });
  }

  const comparableEvidence = linkedEvidence
    .map((entry) => ({ reference: referenceFor(entry), values: extractComparableValues(entry.evidence.metric) }))
    .filter((entry) => entry.values.length === 1)
    .map((entry) => ({ reference: entry.reference, value: entry.values[0] }));

  if (!comparableEvidence.length) {
    return result("needs-review", "Linked evidence exists, but none provides one unambiguous comparable metric value.", {
      ...base,
      claimValues,
    });
  }

  const unitsMatch = comparableEvidence.every((entry) => entry.value.unit === claimValues[0].unit);
  if (!unitsMatch) {
    return result("needs-review", "The claim and linked evidence use incompatible units, so the values were not compared.", {
      ...base,
      claimValues,
      evidenceValues: comparableEvidence,
    });
  }

  const firstEvidenceValue = comparableEvidence[0].value;
  if (!comparableEvidence.every((entry) => sameValue(entry.value, firstEvidenceValue))) {
    return result("needs-review", "Linked evidence contains conflicting metric values. Researcher review is required before verification.", {
      ...base,
      claimValues,
      evidenceValues: comparableEvidence,
    });
  }

  if (sameValue(claimValues[0], firstEvidenceValue)) {
    return result("verified", `The manuscript value ${claimValues[0].raw} matches the linked evidence value ${firstEvidenceValue.raw}.`, {
      ...base,
      claimValues,
      evidenceValues: comparableEvidence,
    });
  }

  return result("contradicted", `The manuscript value ${claimValues[0].raw} does not match the linked evidence value ${firstEvidenceValue.raw}.`, {
    ...base,
    claimValues,
    evidenceValues: comparableEvidence,
    suggestedValue: firstEvidenceValue,
  });
}

export function normalizeAgentVerification(input, evidenceReferences, checkedAt = new Date().toISOString()) {
  if (!VERIFICATION_OUTCOMES.includes(input.outcome)) return null;
  return {
    outcome: input.outcome,
    verificationState: outcomeState[input.outcome],
    reason: input.reason.trim(),
    reasons: [input.reason.trim()],
    checkedAt,
    source: "external-agent",
    evidenceReferences,
  };
}
