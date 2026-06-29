import assert from "node:assert/strict";
import test from "node:test";
import { recommendTeam, scoreTeamMemberForOpportunity } from "../src/lib/team/match";
import { seedOpportunities } from "../src/lib/funding/seed";

test("recommendTeam selects a plausible PI from saved metadata", () => {
  const recommendation = recommendTeam(seedOpportunities[0], [
    {
      id: "a",
      fullName: "Dr. Amina Researcher",
      preferredRole: "PI",
      institution: "Example University",
      country: "Kenya",
      region: "East Africa",
      googleScholarUrl: "https://scholar.google.com/citations?user=example",
      expertiseKeywords: ["climate", "health systems", "implementation"],
      domainExpertise: ["climate health", "health systems"],
      methodsExpertise: ["mixed-methods", "community health"],
      geographicExperience: ["Kenya", "Global South"],
      careerStage: "Mid-career",
      shortBio: "Implementation research with county health teams.",
      publicationSummary: "Publications in climate health implementation.",
      selectedPublications: ["Climate health implementation systems paper"],
      hIndex: 14,
      citationCount: 900,
      notes: "PI and consortium lead experience",
    },
  ]);

  assert.equal(recommendation.dataAvailable, true);
  assert.equal(recommendation.bestPi?.name, "Dr. Amina Researcher");
  assert.ok(recommendation.teamStrengthScore > 0);
});

test("scoreTeamMemberForOpportunity returns cautious matching explanation", () => {
  const score = scoreTeamMemberForOpportunity(
    {
      id: "a",
      fullName: "Dr. Amina Researcher",
      preferredRole: "PI",
      institution: "Example University",
      country: "Kenya",
      region: "East Africa",
      googleScholarUrl: "https://scholar.google.com/citations?user=example",
      expertiseKeywords: ["climate", "health systems", "implementation"],
      domainExpertise: ["climate health", "health systems"],
      methodsExpertise: ["mixed-methods", "community health"],
      geographicExperience: ["Kenya", "Global South"],
      careerStage: "Mid-career",
      shortBio: "Implementation research with county health teams.",
      publicationSummary: "Publications in climate health implementation.",
      selectedPublications: ["Climate health implementation systems paper"],
      hIndex: 14,
      citationCount: 900,
      notes: "PI and consortium lead experience",
    },
    seedOpportunities[0],
  );

  assert.equal(score.memberName, "Dr. Amina Researcher");
  assert.ok(score.score > 0);
  assert.match(score.explanation, /appears aligned based on saved metadata/);
  assert.match(score.explanation, /reviewed manually/);
});
