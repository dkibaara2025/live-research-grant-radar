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
  sourceUrl: string;
  title: string;
  shortName: string;
  funder: string;
  url: string;
  deadline: string;
  region: string;
  regionEligibility: string;
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
  baseScore?: number;
};

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
