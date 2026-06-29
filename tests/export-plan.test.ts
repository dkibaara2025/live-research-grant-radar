import assert from "node:assert/strict";
import test from "node:test";
import { scoreOpportunity } from "../src/lib/agent/score";
import { buildPlanExportTitle } from "../src/lib/export/plan";
import { seedOpportunities } from "../src/lib/funding/seed";

const profile = {
  field: "Climate Health",
  region: "Kenya",
  careerStage: "Early-career PI",
  deadlineWindow: "120 days",
  keywords: "climate, health",
  summary: "A practical climate health pilot with community health workflows.",
};

test("buildPlanExportTitle creates a safe PDF title", () => {
  const match = scoreOpportunity(profile, seedOpportunities[0], 1);
  const title = buildPlanExportTitle(profile, match, "2026-06-29T00:00:00.000Z");

  assert.equal(title.includes(" "), false);
  assert.match(title, /^grant-radar-climate-health-/);
  assert.match(title, /2026-06-29$/);
});
