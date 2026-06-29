import { z } from "zod";
import type { FundingOpportunity } from "@/lib/agent/types";
import { normalizeOpportunity } from "../normalize";

const jsonOpportunitySchema = z.object({
  id: z.string().optional(),
  externalId: z.string().optional(),
  title: z.string(),
  shortName: z.string().optional(),
  funder: z.string().optional(),
  source: z.string().optional(),
  sourceUrl: z.string().optional(),
  url: z.string().url().optional(),
  deadline: z.string().optional(),
  region: z.string().optional(),
  regionEligibility: z.string().optional(),
  careerStageEligibility: z.string().optional(),
  amount: z.string().optional(),
  focus: z.string().optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  eligibility: z.string().optional(),
  tags: z.array(z.string()).optional(),
  topics: z.array(z.string()).optional(),
});

const jsonFeedSchema = z.union([
  z.array(jsonOpportunitySchema),
  z.object({
    opportunities: z.array(jsonOpportunitySchema),
  }),
  z.object({
    items: z.array(jsonOpportunitySchema),
  }),
]);

export async function fetchJsonFeed(url: string): Promise<FundingOpportunity[]> {
  const response = await fetchWithTimeout(url, 8000);

  if (!response.ok) {
    throw new Error(`JSON feed returned ${response.status}`);
  }

  const parsed = jsonFeedSchema.safeParse(await response.json());

  if (!parsed.success) {
    throw new Error("JSON feed did not match the expected opportunity shape.");
  }

  const items = Array.isArray(parsed.data)
    ? parsed.data
    : "opportunities" in parsed.data
      ? parsed.data.opportunities
      : parsed.data.items;
  const retrievedAt = new Date().toISOString();

  return items.map((item, index) =>
    normalizeOpportunity(
      {
        ...item,
        externalId: item.externalId ?? item.id ?? `${url}-${index}`,
        sourceUrl: item.sourceUrl ?? url,
        callUrl: item.url,
        applicationUrl: item.url,
        sourceType: "json",
        retrievedAt,
        isLive: true,
        dataMode: "live",
        tags: item.tags ?? ["Live JSON feed"],
      },
      {
        source: item.source ?? url,
        sourceType: "json",
        sourceUrl: url,
        dataMode: "live",
        isLive: true,
        retrievedAt,
      },
    ),
  );
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
