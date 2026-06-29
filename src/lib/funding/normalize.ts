import type { DataMode, FundingOpportunity } from "@/lib/agent/types";

export type OpportunityInput = {
  id?: string;
  externalId?: string;
  title: string;
  shortName?: string;
  funder?: string;
  source?: string;
  sourceUrl?: string;
  url?: string;
  deadline?: string;
  region?: string;
  regionEligibility?: string;
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
  baseScore?: number;
};

export type NormalizeContext = {
  source: string;
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

  return {
    id: `${context.dataMode}-${slugify(context.source)}-${slugify(externalId)}`,
    externalId,
    source: input.source ?? context.source,
    sourceUrl: input.sourceUrl ?? context.sourceUrl,
    title: cleanText(input.title),
    shortName: cleanText(input.shortName ?? input.title),
    funder: cleanText(input.funder ?? "Unknown funder"),
    url: input.url ?? context.sourceUrl,
    deadline: cleanText(input.deadline ?? "Needs verification"),
    region: cleanText(input.region ?? input.regionEligibility ?? "Needs verification"),
    regionEligibility: cleanText(input.regionEligibility ?? input.region ?? "Needs verification"),
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

function stableId(value: string) {
  return slugify(value) || "opportunity";
}
