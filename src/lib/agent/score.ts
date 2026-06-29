import type {
  FundingOpportunity,
  RankedOpportunity,
  ResearchProfile,
} from "./types";

export function scoreOpportunity(
  profile: ResearchProfile,
  opportunity: FundingOpportunity,
  rank: number,
): RankedOpportunity {
  const profileText = normalize(
    [
      profile.field,
      profile.region,
      profile.careerStage,
      profile.deadlineWindow,
      profile.keywords,
      profile.summary,
    ].join(" "),
  );
  const opportunityText = normalize(
    [
      opportunity.title,
      opportunity.funder,
      opportunity.region,
      opportunity.focus,
      opportunity.summary,
      opportunity.eligibility,
      opportunity.tags.join(" "),
    ].join(" "),
  );
  const profileTerms = keywordTerms(profile.keywords || profile.field);

  let score = opportunity.baseScore ?? 55;
  const rationale: string[] = [];

  const matchedTerms = profileTerms.filter((term) =>
    opportunityText.includes(term),
  );

  if (matchedTerms.length > 0) {
    score += Math.min(16, matchedTerms.length * 4);
    rationale.push(`Keyword overlap: ${matchedTerms.slice(0, 4).join(", ")}.`);
  }

  const regionTerms = keywordTerms(profile.region);
  const matchedRegions = regionTerms.filter((term) =>
    opportunityText.includes(term),
  );

  if (
    matchedRegions.length > 0 ||
    opportunityText.includes("global south") ||
    opportunityText.includes("international")
  ) {
    score += 8;
    rationale.push("Geographic eligibility appears compatible.");
  }

  if (profileText.includes("early") && opportunityText.includes("early")) {
    score += 5;
    rationale.push("Career-stage language is aligned.");
  }

  if (
    profileText.includes("implementation") &&
    opportunityText.includes("implementation")
  ) {
    score += 7;
    rationale.push("Implementation-science emphasis is explicit.");
  }

  if (rationale.length < 3) {
    rationale.push("Eligibility still needs human review before submission.");
  }

  return {
    ...opportunity,
    rank,
    score: clamp(score, 35, 98),
    rationale: rationale.slice(0, 3),
    eligibilityNotes: opportunity.eligibility,
    actionPlan: fallbackActionPlan(profile, opportunity),
    planSummary: `Prepare a focused ${profile.field || "research"} concept for ${opportunity.funder}.`,
    llmProvider: "fallback",
  };
}

export function fallbackActionPlan(
  profile: ResearchProfile,
  opportunity: FundingOpportunity,
) {
  const field = profile.field || "the project";
  const region = profile.region || opportunity.region;

  return [
    `Draft a two-page concept note linking ${field} to ${opportunity.focus}.`,
    `Confirm eligibility, host institution requirements, and ${region} partner documentation.`,
    `Build a lean budget for ${opportunity.amount} with clear milestones.`,
    "Request collaborator letters and create a submission calendar.",
  ];
}

function keywordTerms(value: string) {
  return normalize(value)
    .split(/[\s,;]+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 3);
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s,;-]/g, " ");
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
