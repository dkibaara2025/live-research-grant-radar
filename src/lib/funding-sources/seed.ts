import type { FundingOpportunity } from "../agent/types";

export const seedOpportunities: FundingOpportunity[] = [
  {
    id: "seed-wellcome-climate-health",
    externalId: "wellcome-climate-health",
    source: "Seed source",
    title: "Climate Health Implementation Award",
    shortName: "Climate Health Implementation Award",
    funder: "Wellcome-style global health fund",
    url: "https://example.org/climate-health-implementation-award",
    deadline: "Aug 30",
    region: "Global South",
    amount: "Up to $250k",
    focus: "climate adaptation and health delivery",
    summary:
      "Supports implementation research that tests practical climate-health interventions in health systems.",
    eligibility:
      "Strong fit for a Kenya-based early-career team with implementation science and community health delivery evidence.",
    tags: ["Climate", "Health systems", "Pilot"],
    baseScore: 82,
  },
  {
    id: "seed-nih-global-ncd",
    externalId: "nih-global-ncd",
    source: "Seed source",
    title: "Global NCD Digital Methods Exploratory Grant",
    shortName: "Global NCD Digital Methods",
    funder: "NIH-style public health fund",
    url: "https://example.org/global-ncd-digital-methods",
    deadline: "Sep 12",
    region: "LMIC collaborators",
    amount: "Up to $175k",
    focus: "digital tools, NCD prevention, implementation research",
    summary:
      "Funds exploratory global health methods projects with implementation research and measurable disease outcomes.",
    eligibility:
      "Likely eligible if the team names an approved partner institution route and narrows the disease focus.",
    tags: ["Exploratory", "NCD", "Methods"],
    baseScore: 74,
  },
  {
    id: "seed-africa-innovation-seed",
    externalId: "africa-innovation-seed",
    source: "Seed source",
    title: "Africa Innovation Seed Fund for Health Delivery",
    shortName: "Africa Innovation Seed Fund",
    funder: "Regional innovation fund",
    url: "https://example.org/africa-innovation-seed-fund",
    deadline: "Oct 5",
    region: "Sub-Saharan Africa",
    amount: "Up to $80k",
    focus: "locally led health delivery innovation",
    summary:
      "Backs Africa-led proof-of-concept projects that improve local health delivery operations.",
    eligibility:
      "Good regional and career-stage fit; proposal should foreground local leadership and near-term operational uptake.",
    tags: ["Africa-led", "Seed", "Delivery"],
    baseScore: 70,
  },
  {
    id: "seed-data-equity-fellowship",
    externalId: "data-equity-fellowship",
    source: "Seed source",
    title: "Data Equity Fellowship for Public Health Researchers",
    shortName: "Data Equity Fellowship",
    funder: "Open science fellowship program",
    url: "https://example.org/data-equity-fellowship",
    deadline: "Nov 1",
    region: "International",
    amount: "Stipend plus travel",
    focus: "data equity, reproducible analysis, policy translation",
    summary:
      "Supports public health researchers improving open, equitable data practices and policy translation.",
    eligibility:
      "Potential fit if the project includes open data methods, reproducible analysis, and a mentorship plan.",
    tags: ["Fellowship", "Open data", "Policy"],
    baseScore: 58,
  },
];
