import type {
  AgentWarning,
  DataMode,
  FundingOpportunity,
  SourceStatus,
} from "@/lib/agent/types";
import {
  getCachedOpportunities,
  listManualFundingOpportunities,
  saveSourceCache,
} from "@/db/repository";
import { fetchGrantsGov } from "./adapters/grants-gov";
import { fetchJsonFeed } from "./adapters/json";
import { fetchRssFeed } from "./adapters/rss";
import { seedOpportunities } from "./seed";

export type FundingSourceResult = {
  opportunities: FundingOpportunity[];
  sourceCount: number;
  warnings: AgentWarning[];
  dataMode: DataMode;
  sourceStatuses: SourceStatus[];
};

type SourceConfig = {
  key: string;
  label: string;
  sourceUrl: string;
  kind: "grants-gov" | "json" | "rss";
  keyword?: string;
};

export async function fetchFundingSources(): Promise<FundingSourceResult> {
  const warnings: AgentWarning[] = [];
  const statuses: SourceStatus[] = [];
  const configs = parseFundingFeeds(process.env.FUNDING_FEEDS);
  const manualOpportunities = await listManualFundingOpportunities();
  const manualStatus = manualOpportunities.length
    ? status({
        key: "manual",
        label: "Manual opportunities",
        sourceUrl: "database",
        mode: "cached",
        ok: true,
        count: manualOpportunities.length,
        message: "Using manually maintained opportunities from the database.",
      })
    : null;

  if (manualStatus) {
    statuses.push(manualStatus);
  }

  if (configs.length === 0) {
    if (manualOpportunities.length > 0) {
      return {
        opportunities: manualOpportunities,
        sourceCount: 1,
        warnings,
        dataMode: "cached",
        sourceStatuses: statuses,
      };
    }

    return {
      opportunities: seedOpportunities,
      sourceCount: 1,
      warnings,
      dataMode: "seed",
      sourceStatuses: [
        status({
          key: "seed",
          label: "Demo seed fallback",
          sourceUrl: "local-seed",
          mode: "seed",
          ok: true,
          count: seedOpportunities.length,
          message: "No FUNDING_FEEDS configured; showing labelled demo opportunities.",
        }),
      ],
    };
  }

  const liveOpportunities: FundingOpportunity[] = [];
  const cacheKeys: string[] = [];

  for (const config of configs) {
    cacheKeys.push(config.key);

    try {
      const opportunities = await fetchConfiguredSource(config);

      if (opportunities.length === 0) {
        statuses.push(
          status({
            ...config,
            mode: "live",
            ok: false,
            count: 0,
            message: "Source responded but did not contain parseable opportunities.",
          }),
        );
        continue;
      }

      liveOpportunities.push(...opportunities);
      statuses.push(
        status({
          ...config,
          mode: "live",
          ok: true,
          count: opportunities.length,
          message: "Source returned live opportunities.",
        }),
      );
      await saveSourceCache(config.key, config.label, config.sourceUrl, opportunities);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Source request failed.";

      warnings.push({
        code: "SOURCE_FETCH_ERROR",
        message: `${config.label}: ${message}`,
      });
      statuses.push(
        status({
          ...config,
          mode: "live",
          ok: false,
          count: 0,
          message,
        }),
      );
    }
  }

  if (liveOpportunities.length > 0) {
    return {
      opportunities: dedupeOpportunities([...manualOpportunities, ...liveOpportunities]),
      sourceCount: configs.length + (manualOpportunities.length > 0 ? 1 : 0),
      warnings,
      dataMode: "live",
      sourceStatuses: statuses,
    };
  }

  const cached = await getCachedOpportunities(cacheKeys);

  if (cached.opportunities.length > 0) {
    return {
      opportunities: dedupeOpportunities([
        ...manualOpportunities,
        ...cached.opportunities,
      ]),
      sourceCount: configs.length + (manualOpportunities.length > 0 ? 1 : 0),
      warnings,
      dataMode: "cached",
      sourceStatuses: [
        ...statuses,
        status({
          key: "cache",
          label: "Cached feed data",
          sourceUrl: "database",
          mode: "cached",
          ok: true,
          count: cached.opportunities.length,
          message: "Live feeds were unavailable; using cached source results.",
        }),
      ],
    };
  }

  return {
    opportunities: dedupeOpportunities([...manualOpportunities, ...seedOpportunities]),
    sourceCount: configs.length + 1,
    warnings,
    dataMode: manualOpportunities.length > 0 ? "cached" : "seed",
    sourceStatuses: [
      ...statuses,
      status({
        key: "seed",
        label: "Demo seed fallback",
        sourceUrl: "local-seed",
        mode: "seed",
        ok: true,
        count: seedOpportunities.length,
        message: "No live or cached opportunities were available; showing labelled demo data.",
      }),
    ],
  };
}

export function parseFundingFeeds(value: string | undefined): SourceConfig[] {
  if (!value) {
    return [];
  }

  return value
    .split(/[\n,;]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      if (entry.startsWith("grants-gov")) {
        const [, keyword] = entry.split(":");

        return {
          key: `grants-gov:${keyword?.trim() || "research"}`,
          label: "Grants.gov public search",
          sourceUrl: "https://api.grants.gov/v1/api/search2",
          kind: "grants-gov" as const,
          keyword: keyword?.trim() || "research",
        };
      }

      let url: URL;

      try {
        url = new URL(entry);
      } catch {
        return {
          key: `invalid:${entry}`,
          label: `Invalid feed: ${entry}`,
          sourceUrl: entry,
          kind: "json" as const,
        };
      }

      const kind = /\.(xml|rss|atom)(\?|$)/i.test(entry) ? "rss" : "json";

      return {
        key: entry,
        label: url.hostname,
        sourceUrl: entry,
        kind,
      };
    });
}

async function fetchConfiguredSource(config: SourceConfig) {
  if (config.kind === "grants-gov") {
    const result = await fetchGrantsGov(config.keyword);
    return result.opportunities;
  }

  if (config.kind === "rss") {
    return fetchRssFeed(config.sourceUrl);
  }

  return fetchJsonFeed(config.sourceUrl);
}

function dedupeOpportunities(opportunities: FundingOpportunity[]) {
  const seen = new Set<string>();

  return opportunities.filter((opportunity) => {
    const key = `${opportunity.source}:${opportunity.externalId}:${opportunity.title}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function status(input: {
  key: string;
  label: string;
  sourceUrl: string;
  mode: DataMode;
  ok: boolean;
  count: number;
  message: string;
}): SourceStatus {
  return {
    ...input,
    retrievedAt: new Date().toISOString(),
  };
}
