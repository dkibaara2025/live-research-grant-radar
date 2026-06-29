import type {
  FundingOpportunity,
  ResearchProfile,
  TeamMember,
  TeamMemberFit,
  TeamMemberScore,
  TeamRecommendation,
} from "@/lib/agent/types";

export function recommendTeam(
  opportunity: FundingOpportunity,
  members: TeamMember[],
  profile?: ResearchProfile,
): TeamRecommendation {
  if (members.length === 0) {
    return {
      coInvestigators: [],
      missingExpertise: ["No team profiles saved yet. Add team members in Admin to enable PI and co-investigator matching."],
      teamStrengthScore: 0,
      reasons: ["No saved team metadata was available for this run."],
      risks: ["Google Scholar profiles and publication relevance should be reviewed manually."],
      writingPlan: [],
      letterSupportPlan: [],
      dataAvailable: false,
    };
  }

  const scored = members
    .map((member) => scoreTeamMemberForOpportunity(member, opportunity, profile))
    .sort((left, right) => right.score - left.score);
  const fits = scored.map(toTeamMemberFit);
  const bestPi =
    fits.find((fit) => fit.recommendedRole === "PI" && fit.fitScore >= 35) ??
    fits[0];
  const coInvestigators = fits
    .filter((fit) => fit.memberId !== bestPi.memberId)
    .slice(0, 4);
  const teamStrengthScore = Math.round(
    (bestPi.fitScore + coInvestigators.reduce((total, fit) => total + fit.fitScore, 0)) /
      Math.max(1, coInvestigators.length + 1),
  );
  const missingExpertise = missingExpertiseFor(opportunity, scored);

  return {
    bestPi,
    coInvestigators,
    missingExpertise,
    teamStrengthScore,
    reasons: [
      `${bestPi.name} appears aligned based on saved metadata for the recommended PI role.`,
      `${coInvestigators.length} co-investigator candidate(s) add complementary saved expertise.`,
    ],
    risks: [
      "Google Scholar profile should be reviewed manually before final PI/co-investigator selection.",
      ...scored.flatMap((score) => score.weakSignals).slice(0, 2),
    ],
    writingPlan: writingPlan(bestPi, coInvestigators),
    letterSupportPlan: [
      `${bestPi.name} should provide PI biosketch and leadership evidence.`,
      ...coInvestigators
        .slice(0, 2)
        .map((fit) => `${fit.name} should provide role confirmation and supporting evidence.`),
    ],
    dataAvailable: true,
  };
}

export function scoreTeamMemberForOpportunity(
  teamMember: TeamMember,
  opportunity: FundingOpportunity,
  researchProfile?: ResearchProfile,
): TeamMemberScore {
  const callText = normalize(
    [
      opportunity.title,
      opportunity.funder,
      opportunity.topics.join(" "),
      opportunity.tags.join(" "),
      opportunity.focus,
      opportunity.description,
      opportunity.regionEligibility,
      opportunity.countryEligibility,
      opportunity.careerStageEligibility,
      researchProfile?.field,
      researchProfile?.keywords,
      researchProfile?.region,
      researchProfile?.summary,
    ]
      .filter(Boolean)
      .join(" "),
  );
  const keywordMatches = overlap(teamMember.expertiseKeywords, callText);
  const domainMatches = overlap(teamMember.domainExpertise, callText);
  const methodMatches = overlap(teamMember.methodsExpertise, callText);
  const geographyMatches = overlap(
    [
      ...teamMember.geographicExperience,
      teamMember.country,
      teamMember.region,
    ].filter(Boolean) as string[],
    callText,
  );
  const publicationText = normalize(
    [
      teamMember.publicationSummary,
      teamMember.selectedPublications.join(" "),
    ].join(" "),
  );
  const publicationMatches = opportunity.topics.filter((topic) =>
    publicationText.includes(topic.toLowerCase()),
  );
  const fieldExperienceFit = normalize(
    [teamMember.shortBio, teamMember.notes].join(" "),
  );
  const hasFieldExperience =
    fieldExperienceFit.includes("implementation") ||
    fieldExperienceFit.includes("field") ||
    fieldExperienceFit.includes("partner") ||
    fieldExperienceFit.includes("community");
  const piFit = piSuitability(teamMember);
  const score = clamp(
    keywordMatches.length * 8 +
      domainMatches.length * 9 +
      methodMatches.length * 7 +
      geographyMatches.length * 7 +
      publicationMatches.length * 5 +
      (hasFieldExperience ? 8 : 0) +
      piFit,
    0,
    100,
  );
  const positiveSignals = [
    ...keywordMatches.map((term) => `Keyword overlap with ${term}.`),
    ...domainMatches.map((term) => `Domain expertise appears aligned with ${term}.`),
    ...methodMatches.map((term) => `Methods expertise includes ${term}.`),
    ...geographyMatches.map((term) => `Geographic experience includes ${term}.`),
    ...publicationMatches.map((term) => `Publication metadata references ${term}.`),
    ...(hasFieldExperience ? ["Implementation or field experience appears in saved metadata."] : []),
    ...(piFit >= 12 ? ["Preferred role and career stage suggest PI suitability."] : []),
  ].slice(0, 7);
  const weakSignals = [
    ...(keywordMatches.length === 0 ? ["Keyword overlap is limited from saved metadata."] : []),
    ...(domainMatches.length === 0 ? ["Domain expertise needs manual verification."] : []),
    ...(methodMatches.length === 0 ? ["Methods fit is not obvious from saved metadata."] : []),
    ...(geographyMatches.length === 0 ? ["Geography fit needs manual verification."] : []),
    ...(publicationMatches.length === 0 ? ["Publication relevance should be checked manually."] : []),
  ];
  const missingInformation = [
    ...(teamMember.googleScholarUrl ? [] : ["Google Scholar profile URL is missing."]),
    ...(teamMember.publicationSummary || teamMember.selectedPublications.length > 0
      ? []
      : ["Publication summary or selected publications are missing."]),
    ...(teamMember.shortBio ? [] : ["Short bio is missing."]),
    ...(teamMember.hIndex === undefined ? ["h-index is not entered."] : []),
    ...(teamMember.citationCount === undefined ? ["Citation count is not entered."] : []),
  ];
  const suggestedRole = suggestedRoleFor(teamMember, score, methodMatches.length);

  return {
    memberId: teamMember.id,
    memberName: teamMember.fullName,
    suggestedRole,
    score,
    positiveSignals,
    weakSignals,
    missingInformation,
    explanation:
      `${teamMember.fullName} appears aligned based on saved metadata with a ${score}% team-fit score. ` +
      "Google Scholar profile and publication details should be reviewed manually before acting.",
  };
}

function toTeamMemberFit(score: TeamMemberScore): TeamMemberFit {
  return {
    memberId: score.memberId,
    name: score.memberName,
    role: score.suggestedRole,
    fitScore: score.score,
    recommendedRole: score.suggestedRole,
    reasons: score.positiveSignals.length
      ? score.positiveSignals
      : ["Fit needs manual verification from saved metadata."],
    risks: [...score.weakSignals, ...score.missingInformation].slice(0, 4),
    sectionAssignments: sectionAssignments(score.suggestedRole),
  };
}

function suggestedRoleFor(
  member: TeamMember,
  score: number,
  methodMatchCount: number,
): TeamMemberFit["recommendedRole"] {
  if (
    (member.preferredRole === "PI" || member.preferredRole === "Co-PI") &&
    score >= 35
  ) {
    return "PI";
  }

  if (member.preferredRole === "Statistician" || methodMatchCount > 0) {
    return "Methods lead";
  }

  if (member.preferredRole === "Field Lead" || member.preferredRole === "Policy Lead") {
    return "Partner lead";
  }

  if (member.preferredRole === "Mentor") {
    return "Advisor";
  }

  return "Co-investigator";
}

function piSuitability(member: TeamMember) {
  if (member.preferredRole === "PI") {
    return 18;
  }

  if (member.preferredRole === "Co-PI") {
    return 14;
  }

  if (member.careerStage === "Senior" || member.careerStage === "Professor") {
    return 12;
  }

  if (member.careerStage === "Mid-career") {
    return 8;
  }

  return 3;
}

function missingExpertiseFor(
  opportunity: FundingOpportunity,
  scores: TeamMemberScore[],
) {
  const signals = scores
    .flatMap((score) => score.positiveSignals)
    .join(" ")
    .toLowerCase();
  const missing = opportunity.topics
    .slice(0, 5)
    .filter((topic) => !signals.includes(topic.toLowerCase()))
    .map((topic) => `Need stronger saved team evidence for ${topic}.`);

  return missing.length > 0 ? missing : ["No major missing expertise detected from saved metadata."];
}

function writingPlan(bestPi: TeamMemberFit, coInvestigators: TeamMemberFit[]) {
  return [
    `${bestPi.name} should own aims, significance, and PI eligibility narrative.`,
    ...coInvestigators
      .slice(0, 3)
      .map((fit) => `${fit.name} should draft ${fit.sectionAssignments[0] ?? "technical contribution"}.`),
  ];
}

function sectionAssignments(role: TeamMemberFit["recommendedRole"]) {
  if (role === "PI") {
    return ["specific aims", "leadership plan", "institutional fit"];
  }

  if (role === "Methods lead") {
    return ["methods section", "analysis plan", "data quality"];
  }

  if (role === "Partner lead") {
    return ["implementation plan", "partner roles", "field operations"];
  }

  if (role === "Advisor") {
    return ["mentorship plan", "governance", "review of significance"];
  }

  return ["technical background", "letters/supporting evidence"];
}

function overlap(values: string[], haystack: string) {
  return values
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 2 && haystack.includes(value));
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
