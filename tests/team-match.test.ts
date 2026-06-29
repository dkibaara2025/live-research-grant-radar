import assert from "node:assert/strict";
import test from "node:test";
import { recommendTeam } from "../src/lib/team/match";
import { seedOpportunities } from "../src/lib/funding/seed";

test("recommendTeam selects a plausible PI from saved metadata", () => {
  const recommendation = recommendTeam(seedOpportunities[0], [
    {
      id: "a",
      name: "Dr. Amina Researcher",
      role: "Principal investigator",
      scholarUrl: "https://scholar.google.com/citations?user=example",
      expertise: ["climate", "health systems", "implementation"],
      methods: ["mixed-methods", "community health"],
      geographies: ["Kenya", "Global South"],
      careerStage: "mid-career",
      leadershipStrength: "PI and consortium lead experience",
      publicationHighlights: "Publications in climate health implementation.",
      implementationExperience: "Implementation research with county health teams.",
      availability: "available",
    },
  ]);

  assert.equal(recommendation.dataAvailable, true);
  assert.equal(recommendation.bestPi?.name, "Dr. Amina Researcher");
  assert.ok(recommendation.teamStrengthScore > 0);
});
