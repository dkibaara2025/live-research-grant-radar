import { z } from "zod";

export const researchProfileSchema = z.object({
  field: z.string().trim().min(2).max(120),
  region: z.string().trim().min(2).max(120),
  careerStage: z.string().trim().min(2).max(80),
  deadlineWindow: z.string().trim().min(2).max(80),
  keywords: z.string().trim().min(2).max(240),
  summary: z.string().trim().min(20).max(1600),
});

export const radarRequestSchema = z.object({
  profile: researchProfileSchema,
});

export const rankedOpportunitySchema = z.object({
  id: z.string().min(1),
  externalId: z.string().min(1),
  source: z.string().min(1),
  title: z.string().min(1),
  shortName: z.string().min(1),
  funder: z.string().min(1),
  url: z.string().url(),
  deadline: z.string().min(1),
  region: z.string().min(1),
  amount: z.string().min(1),
  focus: z.string().min(1),
  summary: z.string().min(1),
  eligibility: z.string().min(1),
  tags: z.array(z.string()),
  baseScore: z.number().optional(),
  rank: z.number().int().positive(),
  score: z.number().int().min(0).max(100),
  rationale: z.array(z.string()),
  eligibilityNotes: z.string().min(1),
  actionPlan: z.array(z.string()),
  planSummary: z.string().min(1),
  llmProvider: z.enum(["gemini", "fallback"]),
});

export const saveOpportunityRequestSchema = z.object({
  profile: researchProfileSchema,
  match: rankedOpportunitySchema,
});

export function formatValidationError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}
