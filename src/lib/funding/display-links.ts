import type { FundingOpportunity } from "@/lib/agent/types";

type DisplayLinkOpportunity = Pick<
  FundingOpportunity,
  | "externalId"
  | "source"
  | "sourceName"
  | "sourceType"
  | "sourceUrl"
  | "callUrl"
  | "applicationUrl"
>;

const GRANTS_GOV_SEARCH_PAGE = "https://www.grants.gov/search-results";
const GRANTS_GOV_DETAIL_BASE = "https://www.grants.gov/search-results-detail/";

export function getOpportunityDisplayLinks(opportunity: DisplayLinkOpportunity) {
  const grantsGovDetailUrl = getGrantsGovDetailUrl(opportunity);
  const callUrl = usefulUrl(opportunity.callUrl) ?? grantsGovDetailUrl;
  const applicationUrl =
    usefulUrl(opportunity.applicationUrl) ??
    callUrl ??
    (isGrantsGovOpportunity(opportunity) ? GRANTS_GOV_SEARCH_PAGE : undefined);
  const sourceUrl = isGrantsGovOpportunity(opportunity)
    ? GRANTS_GOV_SEARCH_PAGE
    : usefulUrl(opportunity.sourceUrl);

  return {
    sourceName: opportunity.sourceName || opportunity.source || "Unknown source",
    sourceType: opportunity.sourceType || "other",
    sourceUrl,
    sourceLabel: isGrantsGovOpportunity(opportunity)
      ? "Grants.gov search"
      : sourceUrl,
    callUrl,
    applicationUrl,
  };
}

function getGrantsGovDetailUrl(opportunity: DisplayLinkOpportunity) {
  if (!isGrantsGovOpportunity(opportunity)) {
    return undefined;
  }

  const numericId = opportunity.externalId.match(/\d{3,}/)?.[0];

  return numericId ? `${GRANTS_GOV_DETAIL_BASE}${numericId}` : undefined;
}

function isGrantsGovOpportunity(opportunity: DisplayLinkOpportunity) {
  return [
    opportunity.source,
    opportunity.sourceName,
    opportunity.sourceUrl,
    opportunity.callUrl,
    opportunity.applicationUrl,
  ]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes("grants.gov"));
}

function usefulUrl(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed || trimmed === "missing") {
    return undefined;
  }

  return trimmed;
}
