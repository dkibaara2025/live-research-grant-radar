export type ResearchProfile = {
  field: string;
  region: string;
  careerStage: string;
  deadlineWindow: string;
  keywords: string;
  summary: string;
};

export type DataMode = "live" | "cached" | "seed";

export type FundingOpportunity = {
  id: string;
  externalId: string;
  source: string;
  sourceName: string;
  sourceType: FundingSourceType;
  sourceUrl: string;
  callUrl: string;
  applicationUrl: string;
  title: string;
  shortName: string;
  funder: string;
  funderType: string;
  url: string;
  deadline: string;
  region: string;
  regionEligibility: string;
  countryEligibility: string;
  institutionEligibility: string;
  careerStageEligibility: string;
  amount: string;
  focus: string;
  summary: string;
  description: string;
  eligibility: string;
  tags: string[];
  topics: string[];
  retrievedAt: string;
  isLive: boolean;
  dataMode: DataMode;
  needsVerification: string[];
  baseScore?: number;
};

export type FundingSourceType =
  | "government"
  | "foundation"
  | "university"
  | "ngo"
  | "multilateral"
  | "research-council"
  | "fellowship"
  | "innovation"
  | "manual"
  | "rss"
  | "json"
  | "seed"
  | "other";

export type ScoreSignal = "positive" | "neutral" | "negative";

export type ScoreFactor = {
  key:
    | "keywordOverlap"
    | "fieldAlignment"
    | "geography"
    | "careerStage"
    | "deadline"
    | "funderPriority"
    | "amountFit";
  label: string;
  score: number;
  max: number;
  signal: ScoreSignal;
  explanation: string;
};

export type RankedOpportunity = FundingOpportunity & {
  rank: number;
  score: number;
  scoreBreakdown: ScoreFactor[];
  rationale: string[];
  positiveSignals: string[];
  negativeSignals: string[];
  needsVerification: string[];
  eligibilityNotes: string;
  actionPlan: string[];
  planSummary: string;
  topMatchReason: string;
  llmProvider: "gemini" | "fallback";
  teamRecommendation: TeamRecommendation;
  proposalRecommendation: ProposalRecommendation;
  nextSevenDayPlan: string[];
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  email?: string;
  scholarUrl?: string;
  affiliation?: string;
  expertise: string[];
  methods: string[];
  geographies: string[];
  careerStage: string;
  leadershipStrength: string;
  publicationHighlights: string;
  implementationExperience: string;
  availability: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TeamMemberFit = {
  memberId: string;
  name: string;
  role: string;
  fitScore: number;
  recommendedRole: "PI" | "Co-investigator" | "Methods lead" | "Advisor" | "Partner lead";
  reasons: string[];
  risks: string[];
  sectionAssignments: string[];
};

export type TeamRecommendation = {
  bestPi?: TeamMemberFit;
  coInvestigators: TeamMemberFit[];
  missingExpertise: string[];
  teamStrengthScore: number;
  reasons: string[];
  risks: string[];
  writingPlan: string[];
  letterSupportPlan: string[];
  dataAvailable: boolean;
};

export type ProposalStatus =
  | "draft"
  | "submitted"
  | "funded"
  | "rejected"
  | "concept note"
  | "full proposal";

export type ProposalRecord = {
  id: string;
  title: string;
  projectArea: string;
  abstract: string;
  fullText: string;
  funderTarget?: string;
  previousCall?: string;
  status: ProposalStatus;
  year: number;
  piTeam?: string;
  keywords: string[];
  methods: string[];
  geography: string;
  budgetRange: string;
  fileName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ProposalRecommendation = {
  bestProposal?: {
    id: string;
    title: string;
    status: ProposalStatus;
    fitScore: number;
  };
  fitScore: number;
  whyFits: string[];
  adaptationChecklist: Array<{
    action: "Reuse as-is" | "Revise lightly" | "Rewrite" | "Add" | "Remove" | "Verify";
    item: string;
  }>;
  reusableSections: string[];
  rewriteSections: string[];
  newEvidenceNeeded: string[];
  suggestedPackage: string[];
  dataAvailable: boolean;
};

export type AgentWarning = {
  code: string;
  message: string;
};

export type SourceStatus = {
  key: string;
  label: string;
  sourceUrl: string;
  mode: DataMode;
  ok: boolean;
  count: number;
  message: string;
  retrievedAt: string;
};

export type RadarRunMeta = {
  durationMs: number;
  generatedAt: string;
  sourceCount: number;
  opportunityCount: number;
  saved: boolean;
  demoMode: boolean;
  dataMode: DataMode;
  sourceStatuses: SourceStatus[];
};

export type RadarRunResponse = {
  profile: ResearchProfile;
  matches: RankedOpportunity[];
  warnings: AgentWarning[];
  meta: RadarRunMeta;
};
