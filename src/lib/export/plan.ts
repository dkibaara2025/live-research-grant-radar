import type { RankedOpportunity, ResearchProfile } from "@/lib/agent/types";

export function buildPlanExportTitle(
  profile: ResearchProfile,
  opportunity: RankedOpportunity,
  generatedAt: string,
) {
  const date = new Date(generatedAt).toISOString().slice(0, 10);
  const field = safeTitlePart(profile.field || "research");
  const title = safeTitlePart(opportunity.shortName || opportunity.title);

  return `grant-radar-${field}-${title}-${date}`;
}

function safeTitlePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}
