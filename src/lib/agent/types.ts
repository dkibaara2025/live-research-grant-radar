export type ResearchProfile = {
  field: string;
  region: string;
  careerStage: string;
  deadlineWindow: string;
  keywords: string;
  summary: string;
};

export type FundingOpportunity = {
  id: string;
  externalId: string;
  source: string;
  title: string;
  shortName: string;
  funder: string;
  url: string;
  deadline: string;
  region: string;
  amount: string;
  focus: string;
  summary: string;
  eligibility: string;
  tags: string[];
  baseScore?: number;
};

export type RankedOpportunity = FundingOpportunity & {
  rank: number;
  score: number;
  rationale: string[];
  eligibilityNotes: string;
  actionPlan: string[];
  planSummary: string;
  llmProvider: "gemini" | "fallback";
};

export type AgentWarning = {
  code: string;
  message: string;
};

export type RadarRunMeta = {
  durationMs: number;
  generatedAt: string;
  sourceCount: number;
  opportunityCount: number;
  saved: boolean;
  demoMode: boolean;
};

export type RadarRunResponse = {
  profile: ResearchProfile;
  matches: RankedOpportunity[];
  warnings: AgentWarning[];
  meta: RadarRunMeta;
};
