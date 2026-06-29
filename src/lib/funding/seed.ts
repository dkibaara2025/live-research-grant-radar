import type { FundingOpportunity } from "@/lib/agent/types";
import { normalizeOpportunity } from "./normalize";

const retrievedAt = "2026-06-29T00:00:00.000Z";

export const seedOpportunities: FundingOpportunity[] = [
  normalizeOpportunity(
    {
      externalId: "wellcome-climate-health-demo",
      title: "Demo: Climate Health Implementation Award",
      shortName: "Climate Health Implementation Award",
      funder: "Demo global health fund",
      url: "https://example.org/demo-climate-health-implementation-award",
      deadline: "Aug 30",
      region: "Global South",
      regionEligibility: "Illustrative Global South eligibility; verify against a real call.",
      careerStageEligibility: "Illustrative early-career PI fit; verify against a real call.",
      amount: "Up to $250k",
      focus: "climate adaptation and health delivery",
      summary:
        "Demo opportunity for implementation research that tests practical climate-health interventions in health systems.",
      description:
        "Seed fallback only. This record is not a live funding call and should not be used as grant advice.",
      eligibility:
        "Demo data only. Use live feeds or manually entered opportunities for real eligibility decisions.",
      tags: ["Demo", "Climate", "Health systems", "Pilot"],
      topics: ["climate", "health systems", "implementation"],
      baseScore: 72,
    },
    {
      source: "Demo seed fallback",
      sourceType: "seed",
      sourceUrl: "local-seed",
      dataMode: "seed",
      isLive: false,
      retrievedAt,
    },
  ),
  normalizeOpportunity(
    {
      externalId: "global-ncd-methods-demo",
      title: "Demo: Global NCD Digital Methods Exploratory Grant",
      shortName: "Global NCD Digital Methods",
      funder: "Demo public health fund",
      url: "https://example.org/demo-global-ncd-digital-methods",
      deadline: "Sep 12",
      region: "LMIC collaborators",
      regionEligibility: "Illustrative LMIC collaboration eligibility; verify against a real call.",
      careerStageEligibility: "Illustrative mentorship requirement; verify against a real call.",
      amount: "Up to $175k",
      focus: "digital tools, NCD prevention, implementation research",
      summary:
        "Demo exploratory global health methods project with implementation research and measurable disease outcomes.",
      description:
        "Seed fallback only. This record is not a live funding call and should not be used as grant advice.",
      eligibility:
        "Demo data only. Use live feeds or manually entered opportunities for real eligibility decisions.",
      tags: ["Demo", "Exploratory", "NCD", "Methods"],
      topics: ["digital health", "NCD", "implementation"],
      baseScore: 66,
    },
    {
      source: "Demo seed fallback",
      sourceType: "seed",
      sourceUrl: "local-seed",
      dataMode: "seed",
      isLive: false,
      retrievedAt,
    },
  ),
  normalizeOpportunity(
    {
      externalId: "africa-innovation-seed-demo",
      title: "Demo: Africa Innovation Seed Fund for Health Delivery",
      shortName: "Africa Innovation Seed Fund",
      funder: "Demo regional innovation fund",
      url: "https://example.org/demo-africa-innovation-seed-fund",
      deadline: "Oct 5",
      region: "Sub-Saharan Africa",
      regionEligibility: "Illustrative Africa-led eligibility; verify against a real call.",
      careerStageEligibility: "Illustrative local leadership preference; verify against a real call.",
      amount: "Up to $80k",
      focus: "locally led health delivery innovation",
      summary:
        "Demo Africa-led proof-of-concept project for improving local health delivery operations.",
      description:
        "Seed fallback only. This record is not a live funding call and should not be used as grant advice.",
      eligibility:
        "Demo data only. Use live feeds or manually entered opportunities for real eligibility decisions.",
      tags: ["Demo", "Africa-led", "Seed", "Delivery"],
      topics: ["health delivery", "innovation", "pilot"],
      baseScore: 62,
    },
    {
      source: "Demo seed fallback",
      sourceType: "seed",
      sourceUrl: "local-seed",
      dataMode: "seed",
      isLive: false,
      retrievedAt,
    },
  ),
];
