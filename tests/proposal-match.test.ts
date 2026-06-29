import assert from "node:assert/strict";
import test from "node:test";
import { recommendProposal } from "../src/lib/proposals/match";
import { recommendTeam } from "../src/lib/team/match";
import { seedOpportunities } from "../src/lib/funding/seed";

test("recommendProposal returns adaptation checklist for strongest proposal", () => {
  const opportunity = seedOpportunities[0];
  const team = recommendTeam(opportunity, []);
  const recommendation = recommendProposal(
    opportunity,
    [
      {
        id: "p1",
        title: "Community health worker heat screening pilot",
        projectArea: "Climate health systems",
        abstract:
          "A climate health implementation pilot using community health workers.",
        fullText:
          "This proposal describes implementation science methods, community health workers, heat-risk screening, and rural Kenya workflows.",
        status: "concept note",
        year: 2025,
        keywords: ["climate", "health systems", "implementation"],
        methods: ["mixed-methods", "implementation science"],
        geography: "Kenya",
        budgetRange: "Up to $250k",
      },
    ],
    team,
  );

  assert.equal(recommendation.dataAvailable, true);
  assert.equal(
    recommendation.bestProposal?.title,
    "Community health worker heat screening pilot",
  );
  assert.ok(
    recommendation.adaptationChecklist.some((item) => item.action === "Rewrite"),
  );
});
