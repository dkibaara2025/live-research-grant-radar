import { z } from "zod";

export const researchProfileSchema = z.object({
  field: z.string().trim().min(2, "Research field must be at least 2 characters.").max(120),
  region: z.string().trim().min(2, "Region must be at least 2 characters.").max(120),
  careerStage: z
    .string()
    .trim()
    .min(2, "Career stage must be selected.")
    .max(80),
  deadlineWindow: z
    .string()
    .trim()
    .min(2, "Deadline window must be at least 2 characters.")
    .max(80),
  keywords: z
    .string()
    .trim()
    .min(2, "Add at least one keyword or topic.")
    .max(240),
  summary: z
    .string()
    .trim()
    .min(20, "Profile summary must be at least 20 characters.")
    .max(1600),
});

export const radarRequestSchema = z.object({
  profile: researchProfileSchema,
});

export const rankedOpportunitySchema = z.object({
  id: z.string().min(1),
  externalId: z.string().min(1),
  source: z.string().min(1),
  sourceUrl: z.string().min(1),
  title: z.string().min(1),
  shortName: z.string().min(1),
  funder: z.string().min(1),
  url: z.string().url(),
  deadline: z.string().min(1),
  region: z.string().min(1),
  regionEligibility: z.string().min(1),
  careerStageEligibility: z.string().min(1),
  amount: z.string().min(1),
  focus: z.string().min(1),
  summary: z.string().min(1),
  description: z.string().min(1),
  eligibility: z.string().min(1),
  tags: z.array(z.string()),
  topics: z.array(z.string()),
  retrievedAt: z.string().min(1),
  isLive: z.boolean(),
  dataMode: z.enum(["live", "cached", "seed"]),
  baseScore: z.number().optional(),
  rank: z.number().int().positive(),
  score: z.number().int().min(0).max(100),
  scoreBreakdown: z.array(
    z.object({
      key: z.enum([
        "keywordOverlap",
        "fieldAlignment",
        "geography",
        "careerStage",
        "deadline",
        "funderPriority",
        "amountFit",
      ]),
      label: z.string(),
      score: z.number(),
      max: z.number(),
      signal: z.enum(["positive", "neutral", "negative"]),
      explanation: z.string(),
    }),
  ),
  rationale: z.array(z.string()),
  positiveSignals: z.array(z.string()),
  negativeSignals: z.array(z.string()),
  needsVerification: z.array(z.string()),
  eligibilityNotes: z.string().min(1),
  actionPlan: z.array(z.string()),
  planSummary: z.string().min(1),
  topMatchReason: z.string().min(1),
  llmProvider: z.enum(["gemini", "fallback"]),
});

export const saveOpportunityRequestSchema = z.object({
  profile: researchProfileSchema,
  match: rankedOpportunitySchema,
});

export const manualOpportunitySchema = z.object({
  title: z.string().trim().min(3).max(240),
  funder: z.string().trim().min(2).max(180),
  url: z.string().trim().url(),
  deadline: z.string().trim().min(2).max(120),
  amount: z.string().trim().min(2).max(120),
  regionEligibility: z.string().trim().min(2).max(300),
  careerStageEligibility: z.string().trim().min(2).max(300),
  topics: z.array(z.string().trim().min(1)).min(1).max(12),
  description: z.string().trim().min(20).max(2000),
});

export function formatValidationError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}
