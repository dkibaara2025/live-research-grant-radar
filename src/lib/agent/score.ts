import type {
  FundingOpportunity,
  RankedOpportunity,
  ResearchProfile,
  ScoreFactor,
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
  const keywordOverlap = scoreKeywordOverlap(profile, opportunityText);
  const fieldAlignment = scoreFieldAlignment(profile, opportunityText);
  const geography = scoreGeography(profile, opportunityText, opportunity);
  const careerStage = scoreCareerStage(profile, opportunityText, opportunity);
  const deadline = scoreDeadline(opportunity.deadline);
  const funderPriority = scoreFunderPriority(profile, opportunityText);
  const amountFit = scoreAmountFit(profile, opportunity);
  const scoreBreakdown = [
    keywordOverlap,
    fieldAlignment,
    geography,
    careerStage,
    deadline,
    funderPriority,
    amountFit,
  ];
  const positiveSignals = scoreBreakdown
    .filter((factor) => factor.signal === "positive")
    .map((factor) => factor.explanation);
  const negativeSignals = scoreBreakdown
    .filter((factor) => factor.signal === "negative")
    .map((factor) => factor.explanation);
  const needsVerification = verificationItems(opportunity);
  const score = clamp(
    scoreBreakdown.reduce((total, factor) => total + factor.score, 0) +
      (opportunity.baseScore ?? 0) * 0.12,
    20,
    98,
  );
  const rationale = [
    ...positiveSignals.slice(0, 2),
    needsVerification[0] ?? "Eligibility should be verified against the source record.",
  ].slice(0, 3);

  void profileText;

  return {
    ...opportunity,
    rank,
    score,
    scoreBreakdown,
    rationale,
    positiveSignals,
    negativeSignals,
    needsVerification,
    eligibilityNotes: opportunity.eligibility,
    actionPlan: fallbackActionPlan(profile, opportunity),
    planSummary: `Prepare a focused ${profile.field || "research"} concept for ${opportunity.funder}.`,
    topMatchReason:
      positiveSignals[0] ??
      "This opportunity appears to be one of the stronger available matches, but eligibility needs verification.",
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

function scoreKeywordOverlap(
  profile: ResearchProfile,
  opportunityText: string,
): ScoreFactor {
  const terms = keywordTerms(profile.keywords || profile.field);
  const matched = terms.filter((term) => opportunityText.includes(term));
  const score = Math.min(20, matched.length * 5);

  return {
    key: "keywordOverlap",
    label: "Keyword/topic overlap",
    score,
    max: 20,
    signal: score >= 10 ? "positive" : score === 0 ? "negative" : "neutral",
    explanation:
      matched.length > 0
        ? `Keyword overlap appears aligned: ${matched.slice(0, 4).join(", ")}.`
        : "No strong keyword overlap was detected from the available text.",
  };
}

function scoreFieldAlignment(
  profile: ResearchProfile,
  opportunityText: string,
): ScoreFactor {
  const fieldTerms = keywordTerms(profile.field);
  const matched = fieldTerms.filter((term) => opportunityText.includes(term));
  const score = Math.min(18, matched.length * 6);

  return {
    key: "fieldAlignment",
    label: "Research field alignment",
    score,
    max: 18,
    signal: score >= 12 ? "positive" : score === 0 ? "negative" : "neutral",
    explanation:
      matched.length > 0
        ? `Research field appears aligned through ${matched.slice(0, 3).join(", ")}.`
        : "Research field alignment is weak or not visible in the source text.",
  };
}

function scoreGeography(
  profile: ResearchProfile,
  opportunityText: string,
  opportunity: FundingOpportunity,
): ScoreFactor {
  const regionTerms = keywordTerms(profile.region);
  const matched = regionTerms.filter((term) => opportunityText.includes(term));
  const broadEligibility =
    opportunityText.includes("international") ||
    opportunityText.includes("global") ||
    opportunityText.includes("foreign") ||
    opportunity.regionEligibility.toLowerCase().includes("varies");
  const score = matched.length > 0 ? 16 : broadEligibility ? 11 : 3;

  return {
    key: "geography",
    label: "Geography eligibility",
    score,
    max: 16,
    signal: score >= 11 ? "positive" : score <= 4 ? "negative" : "neutral",
    explanation:
      matched.length > 0
        ? `Geography likely compatible based on ${matched.join(", ")}.`
        : broadEligibility
          ? "Geography appears potentially compatible, but the source needs verification."
          : "Geography eligibility is not clearly aligned from available data.",
  };
}

function scoreCareerStage(
  profile: ResearchProfile,
  opportunityText: string,
  opportunity: FundingOpportunity,
): ScoreFactor {
  const stageText = profile.careerStage.toLowerCase();
  const stageTerms = keywordTerms(stageText);
  const matched = stageTerms.filter((term) => opportunityText.includes(term));
  const needsVerification = opportunity.careerStageEligibility
    .toLowerCase()
    .includes("verification");
  const score = matched.length > 0 ? 12 : needsVerification ? 6 : 8;

  return {
    key: "careerStage",
    label: "Career stage eligibility",
    score,
    max: 12,
    signal: score >= 10 ? "positive" : needsVerification ? "neutral" : "negative",
    explanation:
      matched.length > 0
        ? "Career-stage language appears aligned."
        : needsVerification
          ? "Career-stage eligibility needs verification from the source."
          : "Career-stage fit is plausible but not strongly evidenced.",
  };
}

function scoreDeadline(deadline: string): ScoreFactor {
  const normalized = deadline.toLowerCase();
  const score =
    normalized.includes("rolling") || normalized.includes("needs verification")
      ? 6
      : 10;

  return {
    key: "deadline",
    label: "Deadline urgency",
    score,
    max: 10,
    signal: score >= 10 ? "positive" : "neutral",
    explanation:
      score >= 10
        ? "A listed deadline makes planning more actionable."
        : "Deadline needs verification before committing effort.",
  };
}

function scoreFunderPriority(
  profile: ResearchProfile,
  opportunityText: string,
): ScoreFactor {
  const priorityTerms = keywordTerms(`${profile.summary} ${profile.keywords}`);
  const matched = priorityTerms
    .filter((term) => opportunityText.includes(term))
    .slice(0, 5);
  const score = Math.min(14, matched.length * 3);

  return {
    key: "funderPriority",
    label: "Funder priority alignment",
    score,
    max: 14,
    signal: score >= 9 ? "positive" : score === 0 ? "negative" : "neutral",
    explanation:
      matched.length > 0
        ? `Funder priority language appears to overlap with ${matched.join(", ")}.`
        : "Funder priority alignment is not obvious from the available summary.",
  };
}

function scoreAmountFit(
  profile: ResearchProfile,
  opportunity: FundingOpportunity,
): ScoreFactor {
  const amount = opportunity.amount.toLowerCase();
  const summary = profile.summary.toLowerCase();
  const pilotScope =
    summary.includes("pilot") ||
    summary.includes("feasibility") ||
    summary.includes("mixed-methods");
  const listedAmount = !amount.includes("needs verification") && !amount.includes("not listed");
  const score = listedAmount && pilotScope ? 10 : listedAmount ? 8 : 4;

  return {
    key: "amountFit",
    label: "Amount/package suitability",
    score,
    max: 10,
    signal: score >= 8 ? "positive" : "neutral",
    explanation:
      listedAmount && pilotScope
        ? "Award size appears suitable for a focused pilot or feasibility package."
        : listedAmount
          ? "Award size is listed, but package fit still needs budgeting."
          : "Funding amount is not available in the source summary.",
  };
}

function verificationItems(opportunity: FundingOpportunity) {
  const items: string[] = [];

  if (opportunity.eligibility.toLowerCase().includes("verification")) {
    items.push("Eligibility needs verification from the source record.");
  }

  if (opportunity.amount.toLowerCase().includes("verification")) {
    items.push("Award amount needs verification before budgeting.");
  }

  if (opportunity.deadline.toLowerCase().includes("verification")) {
    items.push("Deadline needs verification before planning submission dates.");
  }

  if (opportunity.careerStageEligibility.toLowerCase().includes("verification")) {
    items.push("Career-stage eligibility needs verification.");
  }

  return items.length > 0
    ? items
    : ["Confirm sponsor, eligibility, and submission package against the source."];
}
