import type {
  DataMode,
  FundingOpportunity,
  FundingSourceType,
} from "@/lib/agent/types";

export type OpportunityInput = {
  id?: string;
  externalId?: string;
  title: string;
  shortName?: string;
  funder?: string;
  funderType?: string;
  source?: string;
  sourceName?: string;
  sourceType?: FundingSourceType;
  sourceUrl?: string;
  callUrl?: string;
  applicationUrl?: string;
  url?: string;
  deadline?: string;
  region?: string;
  regionEligibility?: string;
  countryEligibility?: string;
  institutionEligibility?: string;
  careerStageEligibility?: string;
  amount?: string;
  focus?: string;
  summary?: string;
  description?: string;
  eligibility?: string;
  tags?: string[];
  topics?: string[];
  retrievedAt?: string;
  isLive?: boolean;
  dataMode?: DataMode;
  needsVerification?: string[];
  baseScore?: number;
};

export type NormalizeContext = {
  source: string;
  sourceType?: FundingSourceType;
  sourceUrl: string;
  dataMode: DataMode;
  isLive: boolean;
  retrievedAt?: string;
};

export function normalizeOpportunity(
  input: OpportunityInput,
  context: NormalizeContext,
): FundingOpportunity {
  const retrievedAt = input.retrievedAt ?? context.retrievedAt ?? new Date().toISOString();
  const externalId = input.externalId ?? input.id ?? stableId(input.title);
  const tags = compactStrings(input.tags ?? input.topics ?? []);
  const topics = compactStrings(input.topics ?? input.tags ?? []);
  const description = cleanText(input.description ?? input.summary ?? input.focus ?? input.title);
  const summary = cleanText(input.summary ?? description);
  const callUrl = cleanUrl(input.callUrl ?? input.url ?? input.sourceUrl ?? context.sourceUrl);
  const applicationUrl = cleanUrl(input.applicationUrl ?? callUrl);
  const baseNeedsVerification = compactStrings(input.needsVerification ?? []);

  if (!callUrl || callUrl === "missing") {
    baseNeedsVerification.push("Call link missing - needs verification.");
  }

  if (!input.deadline || input.deadline.toLowerCase().includes("verification")) {
    baseNeedsVerification.push("Deadline needs verification.");
  }

  if (!input.amount || input.amount.toLowerCase().includes("verification")) {
    baseNeedsVerification.push("Funding amount needs verification.");
  }

  return {
    id: `${context.dataMode}-${slugify(context.source)}-${slugify(externalId)}`,
    externalId,
    source: input.source ?? context.source,
    sourceName: input.sourceName ?? input.source ?? context.source,
    sourceType: input.sourceType ?? context.sourceType ?? inferSourceType(input.source ?? context.source),
    sourceUrl: input.sourceUrl ?? context.sourceUrl,
    callUrl: callUrl || "missing",
    applicationUrl: applicationUrl || callUrl || "missing",
    title: cleanText(input.title),
    shortName: cleanText(input.shortName ?? input.title),
    funder: cleanText(input.funder ?? "Unknown funder"),
    funderType: cleanText(input.funderType ?? inferFunderType(input.funder ?? input.source ?? context.source)),
    url: callUrl || input.url || context.sourceUrl,
    deadline: cleanText(input.deadline ?? "Needs verification"),
    region: cleanText(input.region ?? input.regionEligibility ?? "Needs verification"),
    regionEligibility: cleanText(input.regionEligibility ?? input.region ?? "Needs verification"),
    countryEligibility: cleanText(input.countryEligibility ?? input.regionEligibility ?? "Needs verification"),
    institutionEligibility: cleanText(input.institutionEligibility ?? "Needs verification"),
    careerStageEligibility: cleanText(
      input.careerStageEligibility ?? "Needs verification",
    ),
    amount: cleanText(input.amount ?? "Needs verification"),
    focus: cleanText(input.focus ?? topics.join(", ") ?? input.title),
    summary,
    description,
    eligibility: cleanText(input.eligibility ?? "Needs verification from source."),
    tags: tags.length > 0 ? tags : ["Needs review"],
    topics: topics.length > 0 ? topics : tags.length > 0 ? tags : ["Needs review"],
    retrievedAt,
    isLive: input.isLive ?? context.isLive,
    dataMode: input.dataMode ?? context.dataMode,
    needsVerification: Array.from(new Set(baseNeedsVerification)),
    baseScore: input.baseScore,
  };
}

export function compactStrings(values: string[]) {
  return values.map((value) => cleanText(value)).filter(Boolean);
}

export function cleanText(value: string) {
  return value.replace(/\s+/g, " ").replace(/<[^>]*>/g, "").trim();
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
}

function cleanUrl(value: string | undefined) {
  const cleaned = value?.trim();

  if (!cleaned) {
    return "";
  }

  return cleaned;
}

function inferSourceType(source: string): FundingSourceType {
  const normalized = source.toLowerCase();

  if (normalized.includes("grants.gov") || normalized.includes("government")) {
    return "government";
  }

  if (normalized.includes("foundation")) {
    return "foundation";
  }

  if (normalized.includes("university")) {
    return "university";
  }

  if (normalized.includes("manual")) {
    return "manual";
  }

  if (normalized.includes("seed") || normalized.includes("demo")) {
    return "seed";
  }

  return "other";
}

function inferFunderType(funder: string) {
  const normalized = funder.toLowerCase();

  if (normalized.includes("foundation")) {
    return "foundation";
  }

  if (
    normalized.includes("department") ||
    normalized.includes("agency") ||
    normalized.includes("national science foundation")
  ) {
    return "government";
  }

  if (normalized.includes("university")) {
    return "university";
  }

  return "needs verification";
}

function stableId(value: string) {
  return slugify(value) || "opportunity";
}
