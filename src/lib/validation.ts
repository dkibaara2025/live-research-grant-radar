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
  sourceName: z.string().min(1),
  sourceType: z.enum([
    "government",
    "foundation",
    "university",
    "ngo",
    "multilateral",
    "research-council",
    "fellowship",
    "innovation",
    "manual",
    "rss",
    "json",
    "seed",
    "other",
  ]),
  sourceUrl: z.string().min(1),
  callUrl: z.string().min(1),
  applicationUrl: z.string().min(1),
  title: z.string().min(1),
  shortName: z.string().min(1),
  funder: z.string().min(1),
  funderType: z.string().min(1),
  url: z.string().url(),
  deadline: z.string().min(1),
  region: z.string().min(1),
  regionEligibility: z.string().min(1),
  countryEligibility: z.string().min(1),
  institutionEligibility: z.string().min(1),
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
  needsVerification: z.array(z.string()),
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
  eligibilityNotes: z.string().min(1),
  actionPlan: z.array(z.string()),
  planSummary: z.string().min(1),
  topMatchReason: z.string().min(1),
  llmProvider: z.enum(["gemini", "fallback"]),
  teamRecommendation: z.any(),
  proposalRecommendation: z.any(),
  nextSevenDayPlan: z.array(z.string()),
});

export const saveOpportunityRequestSchema = z.object({
  profile: researchProfileSchema,
  match: rankedOpportunitySchema,
});

export const manualOpportunitySchema = z.object({
  title: z.string().trim().min(3).max(240),
  funder: z.string().trim().min(2).max(180),
  callUrl: z.string().trim().url("Original call link must be a valid URL."),
  applicationUrl: z.string().trim().url().optional().or(z.literal("")),
  funderType: z.string().trim().min(2).max(120),
  deadline: z.string().trim().min(2).max(120),
  amount: z.string().trim().min(2).max(120),
  regionEligibility: z.string().trim().min(2).max(300),
  careerStageEligibility: z.string().trim().min(2).max(300),
  topics: z.array(z.string().trim().min(1)).min(1).max(12),
  description: z.string().trim().min(20).max(2000),
});

const commaList = z.union([z.array(z.string()), z.string()]).transform((value) =>
  Array.isArray(value)
    ? value.map((item) => item.trim()).filter(Boolean)
    : value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
);

const optionalNonNegativeInt = (max: number) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }

      if (typeof value === "string") {
        return value.replace(/,/g, "");
      }

      return value;
    },
    z.coerce.number().int().min(0).max(max).optional(),
  );

const optionalUrl = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}, z.string().url().optional().or(z.literal("")));

export const teamMemberSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required.").max(160),
  preferredRole: z.enum([
    "PI",
    "Co-PI",
    "Co-Investigator",
    "Mentor",
    "Technical Lead",
    "Statistician",
    "Field Lead",
    "Policy Lead",
    "Other",
  ]),
  institution: z.string().trim().max(180).optional().or(z.literal("")),
  department: z.string().trim().max(180).optional().or(z.literal("")),
  country: z.string().trim().max(120).optional().or(z.literal("")),
  region: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  googleScholarUrl: optionalUrl,
  orcidUrl: optionalUrl,
  personalWebsiteUrl: optionalUrl,
  expertiseKeywords: commaList,
  domainExpertise: commaList,
  methodsExpertise: commaList,
  geographicExperience: commaList,
  careerStage: z.enum([
    "Early-career",
    "Mid-career",
    "Senior",
    "Professor",
    "Practitioner",
    "Other",
  ]),
  shortBio: z.string().trim().max(2000).optional().or(z.literal("")),
  publicationSummary: z.string().trim().max(2000).optional().or(z.literal("")),
  selectedPublications: commaList,
  hIndex: optionalNonNegativeInt(1000),
  citationCount: optionalNonNegativeInt(10000000),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const proposalSchema = z.object({
  title: z.string().trim().min(3).max(240),
  projectArea: z.string().trim().min(2).max(180),
  abstract: z.string().trim().min(20).max(4000),
  fullText: z.string().trim().min(20).max(60000),
  funderTarget: z.string().trim().max(180).optional().or(z.literal("")),
  previousCall: z.string().trim().max(240).optional().or(z.literal("")),
  status: z.enum(["draft", "submitted", "funded", "rejected", "concept note", "full proposal"]),
  year: z.coerce.number().int().min(1990).max(2100),
  piTeam: z.string().trim().max(300).optional().or(z.literal("")),
  keywords: commaList,
  methods: commaList,
  geography: z.string().trim().min(2).max(180),
  budgetRange: z.string().trim().min(2).max(120),
  fileName: z.string().trim().max(240).optional().or(z.literal("")),
});

export function formatValidationError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}
