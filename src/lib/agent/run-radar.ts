import { saveRadarRun } from "@/db/repository";
import { fetchFundingSources } from "../funding-sources/sources";
import { generateGrantPlan } from "../gemini";
import { logInfo, logWarn } from "../logger";
import { scoreOpportunity } from "./score";
import type { AgentWarning, RadarRunResponse, ResearchProfile } from "./types";

export async function runRadar(
  profile: ResearchProfile,
): Promise<RadarRunResponse> {
  const startedAt = Date.now();
  const warnings: AgentWarning[] = [];

  logInfo("radar.run.started", {
    fieldLength: profile.field.length,
    regionLength: profile.region.length,
  });

  const sourceResult = await fetchFundingSources();
  warnings.push(...sourceResult.warnings);

  const scored = sourceResult.opportunities
    .map((opportunity) => scoreOpportunity(profile, opportunity, 0))
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .map((opportunity, index) => ({
      ...opportunity,
      rank: index + 1,
    }));

  const matches = await Promise.all(
    scored.map(async (opportunity) => {
      const plan = await generateGrantPlan(profile, opportunity);

      if (plan.warning) {
        warnings.push(plan.warning);
      }

      return {
        ...opportunity,
        eligibilityNotes: plan.eligibilityNotes,
        actionPlan: plan.actionPlan,
        planSummary: plan.planSummary,
        llmProvider: plan.provider,
      };
    }),
  );

  const saveResult = await saveRadarRun(profile, matches);

  if (saveResult.warning) {
    warnings.push(saveResult.warning);
    logWarn("radar.run.save_skipped", { code: saveResult.warning.code });
  }

  const durationMs = Date.now() - startedAt;

  logInfo("radar.run.completed", {
    durationMs,
    matches: matches.length,
    warnings: warnings.length,
    saved: saveResult.saved,
  });

  return {
    profile,
    matches,
    warnings: dedupeWarnings(warnings),
    meta: {
      durationMs,
      generatedAt: new Date().toISOString(),
      sourceCount: sourceResult.sourceCount,
      opportunityCount: sourceResult.opportunities.length,
      saved: saveResult.saved,
      demoMode: process.env.RADAR_DEMO_MODE !== "false",
    },
  };
}

function dedupeWarnings(warnings: AgentWarning[]) {
  const seen = new Set<string>();

  return warnings.filter((warning) => {
    const key = `${warning.code}:${warning.message}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
