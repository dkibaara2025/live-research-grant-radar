import type {
  FundingOpportunity,
  ProposalRecord,
  ProposalRecommendation,
  TeamRecommendation,
} from "@/lib/agent/types";

export function recommendProposal(
  opportunity: FundingOpportunity,
  proposals: ProposalRecord[],
  team: TeamRecommendation,
): ProposalRecommendation {
  if (proposals.length === 0) {
    return {
      fitScore: 0,
      whyFits: ["No saved proposals were available for proposal matching."],
      adaptationChecklist: [
        {
          action: "Add",
          item: "Paste or save previous proposal text in the Proposal Library.",
        },
      ],
      reusableSections: [],
      rewriteSections: [],
      newEvidenceNeeded: [],
      suggestedPackage: [],
      dataAvailable: false,
    };
  }

  const ranked = proposals
    .map((proposal) => scoreProposal(opportunity, proposal))
    .sort((left, right) => right.fitScore - left.fitScore);
  const best = ranked[0];

  return {
    bestProposal: {
      id: best.proposal.id,
      title: best.proposal.title,
      status: best.proposal.status,
      fitScore: best.fitScore,
    },
    fitScore: best.fitScore,
    whyFits: best.reasons,
    adaptationChecklist: adaptationChecklist(opportunity, best.proposal, team),
    reusableSections: reusableSections(opportunity, best.proposal),
    rewriteSections: [
      "Rewrite funder-specific objectives and expected outputs.",
      "Rewrite eligibility and applicant-fit paragraph for this call.",
      "Rewrite budget justification around the listed award package.",
    ],
    newEvidenceNeeded: [
      "Add latest preliminary data and publications relevant to the call.",
      "Add source-specific eligibility evidence and partner commitments.",
      ...opportunity.needsVerification.slice(0, 2),
    ],
    suggestedPackage: [
      "Specific aims or concept note",
      "PI and team biosketches",
      "Budget and justification",
      "Letters of collaboration/support",
    ],
    dataAvailable: true,
  };
}

function scoreProposal(opportunity: FundingOpportunity, proposal: ProposalRecord) {
  const callText = normalize(
    [
      opportunity.title,
      opportunity.funder,
      opportunity.topics.join(" "),
      opportunity.tags.join(" "),
      opportunity.description,
      opportunity.regionEligibility,
      opportunity.amount,
    ].join(" "),
  );
  const proposalText = normalize(
    [
      proposal.title,
      proposal.projectArea,
      proposal.abstract,
      proposal.fullText.slice(0, 4000),
      proposal.keywords.join(" "),
      proposal.methods.join(" "),
      proposal.geography,
      proposal.budgetRange,
      proposal.funderTarget ?? "",
    ].join(" "),
  );
  const keywordMatches = opportunity.topics.filter((topic) =>
    proposalText.includes(topic.toLowerCase()),
  );
  const methodMatches = proposal.methods.filter((method) =>
    callText.includes(method.toLowerCase()),
  );
  const geographyFit =
    proposal.geography && callText.includes(proposal.geography.toLowerCase()) ? 12 : 4;
  const funderFit =
    proposal.funderTarget && callText.includes(proposal.funderTarget.toLowerCase())
      ? 12
      : 4;
  const statusBoost = proposal.status === "funded" ? 10 : proposal.status === "submitted" ? 7 : 4;
  const fitScore = clamp(
    keywordMatches.length * 9 +
      methodMatches.length * 7 +
      geographyFit +
      funderFit +
      statusBoost,
    0,
    100,
  );

  return {
    proposal,
    fitScore,
    reasons: [
      keywordMatches.length
        ? `Topic overlap: ${keywordMatches.slice(0, 4).join(", ")}.`
        : "Topic overlap is limited and needs reframing.",
      methodMatches.length
        ? `Methods overlap: ${methodMatches.slice(0, 3).join(", ")}.`
        : "Methods fit is not obvious from proposal metadata.",
      geographyFit >= 12
        ? "Geography appears aligned."
        : "Geography should be reframed or verified.",
      `Proposal status is ${proposal.status}; reuse readiness should be reviewed.`,
    ],
  };
}

function adaptationChecklist(
  opportunity: FundingOpportunity,
  proposal: ProposalRecord,
  team: TeamRecommendation,
): ProposalRecommendation["adaptationChecklist"] {
  return [
    {
      action: "Reuse as-is",
      item: `Background and prior rationale from "${proposal.title}" where still accurate.`,
    },
    {
      action: "Revise lightly",
      item: "Methods language that overlaps with the call priorities.",
    },
    {
      action: "Rewrite",
      item: `Objectives and impact framing for ${opportunity.funder}.`,
    },
    {
      action: "Add",
      item: team.bestPi
        ? `PI/team justification naming ${team.bestPi.name} and recommended co-investigators.`
        : "PI/team justification after team profiles are saved.",
    },
    {
      action: "Verify",
      item: "Deadline, eligibility, original call link, amount, and submission route.",
    },
  ];
}

function reusableSections(opportunity: FundingOpportunity, proposal: ProposalRecord) {
  const sections = ["background/significance", "methods overview"];

  if (proposal.geography && opportunity.regionEligibility.toLowerCase().includes(proposal.geography.toLowerCase())) {
    sections.push("geography/context paragraph");
  }

  if (proposal.keywords.some((keyword) => opportunity.topics.join(" ").toLowerCase().includes(keyword.toLowerCase()))) {
    sections.push("topic-specific literature framing");
  }

  return sections;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
