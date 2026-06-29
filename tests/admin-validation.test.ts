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
    fullName: "Dr. Example",
    preferredRole: "PI",
    institution: "Example University",
    department: "Public Health",
    country: "Kenya",
    region: "East Africa",
    email: "",
    googleScholarUrl: "https://scholar.google.com/citations?user=example",
    orcidUrl: "https://orcid.org/0000-0000-0000-0000",
    personalWebsiteUrl: "",
    expertiseKeywords: "climate, health",
    domainExpertise: "climate health",
    methodsExpertise: "mixed-methods",
    geographicExperience: "Kenya",
    careerStage: "Mid-career",
    shortBio: "Implementation partnerships.",
    publicationSummary: "Relevant publications entered manually.",
    selectedPublications: "Example paper",
    hIndex: "12",
    citationCount: "400",
    notes: "PI experience",
  });

  assert.equal(parsed.success, true);
});

test("teamMemberSchema rejects invalid Scholar URLs and metric values", () => {
  const parsed = teamMemberSchema.safeParse({
    fullName: "Dr. Example",
    preferredRole: "PI",
    googleScholarUrl: "not-a-url",
    expertiseKeywords: "climate, health",
    domainExpertise: "climate health",
    methodsExpertise: "mixed-methods",
    geographicExperience: "Kenya",
    careerStage: "Mid-career",
    selectedPublications: "",
    hIndex: "not numeric",
    citationCount: "400",
  });

  assert.equal(parsed.success, false);
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
