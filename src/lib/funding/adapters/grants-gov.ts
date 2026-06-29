import type { FundingOpportunity } from "@/lib/agent/types";
import { normalizeOpportunity } from "../normalize";

type GrantsGovHit = {
  id?: string;
  number?: string;
  title?: string;
  agency?: string;
  agencyCode?: string;
  openDate?: string;
  closeDate?: string;
  oppStatus?: string;
  cfdaList?: string[];
};

type GrantsGovResponse = {
  errorcode?: number;
  msg?: string;
  data?: {
    hitCount?: number;
    oppHits?: GrantsGovHit[];
  };
};

export type GrantsGovResult = {
  opportunities: FundingOpportunity[];
  message: string;
};

// Public Grants.gov webservice endpoint verified from this environment on
// 2026-06-29 with POST /v1/api/search2 returning JSON opportunity hits.
const GRANTS_GOV_SEARCH_URL = "https://api.grants.gov/v1/api/search2";
const GRANTS_GOV_DETAIL_BASE = "https://www.grants.gov/search-results-detail/";

export async function fetchGrantsGov(keyword = "research"): Promise<GrantsGovResult> {
  const retrievedAt = new Date().toISOString();
  const response = await fetchWithTimeout(
    GRANTS_GOV_SEARCH_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        keyword,
        rows: 25,
        oppStatuses: "forecasted|posted",
        resultType: "json",
      }),
    },
    9000,
  );

  if (!response.ok) {
    throw new Error(`Grants.gov returned ${response.status}`);
  }

  const payload = (await response.json()) as GrantsGovResponse;
  const hits = payload.data?.oppHits ?? [];

  return {
    opportunities: hits
      .filter((hit) => hit.title)
      .map((hit) =>
        normalizeOpportunity(
          {
            externalId: hit.id ?? hit.number ?? hit.title ?? "grants-gov",
            title: hit.title ?? "Untitled Grants.gov opportunity",
            shortName: hit.title,
            funder: hit.agency ?? hit.agencyCode ?? "Grants.gov agency",
            sourceName: "Grants.gov",
            sourceType: "government",
            callUrl: hit.id
              ? `${GRANTS_GOV_DETAIL_BASE}${hit.id}`
              : "https://www.grants.gov/search-results",
            applicationUrl: hit.id
              ? `${GRANTS_GOV_DETAIL_BASE}${hit.id}`
              : "https://www.grants.gov/search-results",
            url: hit.id
              ? `${GRANTS_GOV_DETAIL_BASE}${hit.id}`
              : "https://www.grants.gov/search-results",
            deadline: hit.closeDate || "Needs verification",
            region: "United States / international eligibility varies",
            regionEligibility: "Eligibility varies by opportunity; verify on Grants.gov.",
            careerStageEligibility: "Career-stage eligibility is not provided in search results.",
            amount: "Needs verification",
            focus: [keyword, hit.oppStatus, ...(hit.cfdaList ?? [])]
              .filter(Boolean)
              .join(", "),
            summary: `${hit.title}. Status: ${hit.oppStatus ?? "unknown"}. Open date: ${
              hit.openDate ?? "not listed"
            }.`,
            description:
              "Live Grants.gov search result. Open the source record to verify amount, eligibility, and submission package.",
            eligibility:
              "Needs verification on the Grants.gov opportunity detail page.",
            tags: ["Live", "Grants.gov", hit.oppStatus ?? "Status unknown"],
            topics: [keyword, ...(hit.cfdaList ?? [])].filter(Boolean),
            retrievedAt,
            isLive: true,
            dataMode: "live",
            baseScore: 54,
          },
          {
            source: "Grants.gov",
            sourceType: "government",
            sourceUrl: GRANTS_GOV_SEARCH_URL,
            dataMode: "live",
            isLive: true,
            retrievedAt,
          },
        ),
      ),
    message: `Grants.gov returned ${hits.length} opportunity hit(s) for "${keyword}".`,
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
