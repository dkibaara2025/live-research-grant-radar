import type {
  FundingOpportunity,
  TeamMember,
  TeamMemberFit,
  TeamRecommendation,
} from "@/lib/agent/types";

export function recommendTeam(
  opportunity: FundingOpportunity,
  members: TeamMember[],
): TeamRecommendation {
  if (members.length === 0) {
    return {
      coInvestigators: [],
      missingExpertise: ["Add team profiles in Admin to calculate team fit."],
      teamStrengthScore: 0,
      reasons: ["No saved team metadata was available for this run."],
      risks: ["Scholar profiles and publication relevance should be reviewed manually."],
      writingPlan: [],
      letterSupportPlan: [],
      dataAvailable: false,
    };
  }

  const fits = members
    .map((member) => scoreMember(opportunity, member))
    .sort((left, right) => right.fitScore - left.fitScore);
  const bestPi = fits.find((fit) => fit.recommendedRole === "PI") ?? fits[0];
  const coInvestigators = fits
    .filter((fit) => fit.memberId !== bestPi.memberId)
    .slice(0, 4);
  const missingExpertise = missingExpertiseFor(opportunity, fits);
  const teamStrengthScore = Math.round(
    (bestPi.fitScore + coInvestigators.reduce((total, fit) => total + fit.fitScore, 0)) /
      Math.max(1, coInvestigators.length + 1),
  );

  return {
    bestPi,
    coInvestigators,
    missingExpertise,
    teamStrengthScore,
    reasons: [
      `${bestPi.name} appears suitable as PI based on saved metadata.`,
      `${coInvestigators.length} co-investigator candidate(s) add complementary expertise.`,
    ],
    risks: [
      "Scholar profile should be reviewed manually before final PI/co-investigator selection.",
      ...fits.flatMap((fit) => fit.risks).slice(0, 2),
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

function scoreMember(
  opportunity: FundingOpportunity,
  member: TeamMember,
): TeamMemberFit {
  const callText = normalize(
    [
      opportunity.title,
      opportunity.funder,
      opportunity.topics.join(" "),
      opportunity.tags.join(" "),
      opportunity.description,
      opportunity.regionEligibility,
      opportunity.careerStageEligibility,
    ].join(" "),
  );
  const expertiseMatches = overlap(member.expertise, callText);
  const methodMatches = overlap(member.methods, callText);
  const geographyMatches = overlap(member.geographies, callText);
  const implementationFit = normalize(member.implementationExperience).includes("implementation")
    ? 10
    : 4;
  const leadershipFit =
    normalize(member.leadershipStrength).includes("pi") ||
    normalize(member.leadershipStrength).includes("lead")
      ? 18
      : 8;
  const fitScore = clamp(
    expertiseMatches.length * 9 +
      methodMatches.length * 7 +
      geographyMatches.length * 6 +
      implementationFit +
      leadershipFit,
    0,
    100,
  );
  const recommendedRole = leadershipFit >= 18 && fitScore >= 35 ? "PI" : methodMatches.length > 0 ? "Methods lead" : "Co-investigator";

  return {
    memberId: member.id,
    name: member.name,
    role: member.role,
    fitScore,
    recommendedRole,
    reasons: [
      ...expertiseMatches.map((term) => `Expertise overlaps with ${term}.`),
      ...methodMatches.map((term) => `Methods fit includes ${term}.`),
      ...geographyMatches.map((term) => `Geography experience includes ${term}.`),
    ].slice(0, 4),
    risks:
      fitScore < 35
        ? ["Fit is weak from saved metadata; needs manual review."]
        : ["Publication and availability evidence should be verified."],
    sectionAssignments: sectionAssignments(member, recommendedRole),
  };
}

function missingExpertiseFor(
  opportunity: FundingOpportunity,
  fits: TeamMemberFit[],
) {
  const missing = [];
  const joinedReasons = fits.flatMap((fit) => fit.reasons).join(" ").toLowerCase();

  for (const topic of opportunity.topics.slice(0, 5)) {
    if (!joinedReasons.includes(topic.toLowerCase())) {
      missing.push(`Need stronger evidence for ${topic}.`);
    }
  }

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

function sectionAssignments(member: TeamMember, role: TeamMemberFit["recommendedRole"]) {
  if (role === "PI") {
    return ["specific aims", "leadership plan", "institutional fit"];
  }

  if (role === "Methods lead") {
    return ["methods section", "analysis plan", "data quality"];
  }

  return [
    member.implementationExperience ? "implementation plan" : "technical background",
    "letters/supporting evidence",
  ];
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
