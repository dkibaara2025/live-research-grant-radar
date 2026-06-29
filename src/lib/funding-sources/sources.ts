import { z } from "zod";
import type { AgentWarning, FundingOpportunity } from "../agent/types";
import { seedOpportunities } from "./seed";

const remoteOpportunitySchema = z.object({
  id: z.string().optional(),
  externalId: z.string().optional(),
  title: z.string(),
  shortName: z.string().optional(),
  funder: z.string().optional(),
  url: z.string().url().optional(),
  deadline: z.string().optional(),
  region: z.string().optional(),
  amount: z.string().optional(),
  focus: z.string().optional(),
  summary: z.string().optional(),
  eligibility: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const remoteFeedSchema = z.union([
  z.array(remoteOpportunitySchema),
  z.object({
    opportunities: z.array(remoteOpportunitySchema),
  }),
  z.object({
    items: z.array(remoteOpportunitySchema),
  }),
]);

export type FundingSourceResult = {
  opportunities: FundingOpportunity[];
  sourceCount: number;
  warnings: AgentWarning[];
};

export async function fetchFundingSources(): Promise<FundingSourceResult> {
  const warnings: AgentWarning[] = [];
  const remoteFeeds = parseFundingFeeds(process.env.FUNDING_FEEDS);
  const remoteOpportunities: FundingOpportunity[] = [];

  for (const feedUrl of remoteFeeds) {
    try {
      const response = await fetchWithTimeout(feedUrl, 5000);

      if (!response.ok) {
        warnings.push({
          code: "SOURCE_HTTP_ERROR",
          message: `Funding source returned ${response.status}: ${feedUrl}`,
        });
        continue;
      }

      const parsed = remoteFeedSchema.safeParse(await response.json());

      if (!parsed.success) {
        warnings.push({
          code: "SOURCE_PARSE_ERROR",
          message: `Funding source did not match the expected JSON shape: ${feedUrl}`,
        });
        continue;
      }

      const items = Array.isArray(parsed.data)
        ? parsed.data
        : "opportunities" in parsed.data
          ? parsed.data.opportunities
          : parsed.data.items;

      remoteOpportunities.push(
        ...items.map((item, index) => normalizeRemoteOpportunity(item, feedUrl, index)),
      );
    } catch {
      warnings.push({
        code: "SOURCE_FETCH_ERROR",
        message: `Funding source could not be reached: ${feedUrl}`,
      });
    }
  }

  const opportunities = dedupeOpportunities([
    ...remoteOpportunities,
    ...seedOpportunities,
  ]);

  if (remoteFeeds.length === 0) {
    warnings.push({
      code: "SEED_DATA_ONLY",
      message: "No FUNDING_FEEDS configured; using built-in demo opportunities.",
    });
  }

  return {
    opportunities,
    sourceCount: remoteFeeds.length + 1,
    warnings,
  };
}

function parseFundingFeeds(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(/[\n,;]/)
    .map((url) => url.trim())
    .filter(Boolean);
}

function normalizeRemoteOpportunity(
  item: z.infer<typeof remoteOpportunitySchema>,
  feedUrl: string,
  index: number,
): FundingOpportunity {
  const externalId = item.externalId ?? item.id ?? `${feedUrl}-${index}`;

  return {
    id: `remote-${slugify(externalId)}`,
    externalId,
    source: feedUrl,
    title: item.title,
    shortName: item.shortName ?? item.title,
    funder: item.funder ?? "Unknown funder",
    url: item.url ?? feedUrl,
    deadline: item.deadline ?? "Rolling",
    region: item.region ?? "Unspecified",
    amount: item.amount ?? "Not listed",
    focus: item.focus ?? item.summary ?? item.title,
    summary: item.summary ?? item.focus ?? item.title,
    eligibility: item.eligibility ?? "Eligibility details require source review.",
    tags: item.tags ?? ["Live feed"],
    baseScore: 60,
  };
}

function dedupeOpportunities(opportunities: FundingOpportunity[]) {
  const seen = new Set<string>();

  return opportunities.filter((opportunity) => {
    const key = `${opportunity.source}:${opportunity.externalId}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
