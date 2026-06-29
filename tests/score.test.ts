import assert from "node:assert/strict";
import test from "node:test";
import { scoreOpportunity } from "../src/lib/agent/score";
import { seedOpportunities } from "../src/lib/funding/seed";

const profile = {
  field: "Climate and health systems",
  region: "Kenya",
  careerStage: "Early-career PI",
  deadlineWindow: "120 days",
  keywords: "implementation science, community health, adaptation",
  summary:
    "A mixed-methods pilot testing community health worker workflows for heat-risk screening and referral.",
};

test("scoreOpportunity returns explainable scoring factors", () => {
  const scored = scoreOpportunity(profile, seedOpportunities[0], 1);

  assert.equal(scored.rank, 1);
  assert.ok(scored.score > 0);
  assert.equal(scored.scoreBreakdown.length, 7);
  assert.ok(scored.positiveSignals.length > 0);
  assert.ok(scored.needsVerification.length > 0);
});
