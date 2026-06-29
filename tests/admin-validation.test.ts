import assert from "node:assert/strict";
import test from "node:test";
import { manualOpportunitySchema, proposalSchema, teamMemberSchema } from "../src/lib/validation";

test("manualOpportunitySchema requires original call link", () => {
  const parsed = manualOpportunitySchema.safeParse({
    title: "Example call",
    funder: "Example funder",
    callUrl: "not-a-url",
    funderType: "foundation",
    deadline: "Dec 1",
    amount: "$100k",
    regionEligibility: "Kenya",
    careerStageEligibility: "Any",
    topics: ["health"],
    description: "A valid opportunity description with enough detail.",
  });

  assert.equal(parsed.success, false);
});

test("teamMemberSchema accepts Google Scholar profile links", () => {
  const parsed = teamMemberSchema.safeParse({
    name: "Dr. Example",
    role: "PI",
    scholarUrl: "https://scholar.google.com/citations?user=example",
    expertise: "climate, health",
    methods: "mixed-methods",
    geographies: "Kenya",
    careerStage: "mid-career",
    leadershipStrength: "PI experience",
    publicationHighlights: "Relevant publications entered manually.",
    implementationExperience: "Implementation partnerships.",
    availability: "available",
  });

  assert.equal(parsed.success, true);
});

test("proposalSchema accepts pasted proposal text", () => {
  const parsed = proposalSchema.safeParse({
    title: "Climate health pilot",
    projectArea: "Climate health",
    abstract: "A proposal abstract with enough detail for matching.",
    fullText: "A pasted proposal text with enough detail for matching and adaptation recommendations.",
    status: "draft",
    year: 2026,
    keywords: "climate, health",
    methods: "mixed-methods",
    geography: "Kenya",
    budgetRange: "$100k-$250k",
  });

  assert.equal(parsed.success, true);
});
