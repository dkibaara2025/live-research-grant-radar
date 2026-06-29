import { listProposals, listTeamMembers, saveRadarRun } from "@/db/repository";
import { recommendProposal } from "@/lib/proposals/match";
import { recommendTeam } from "@/lib/team/match";
import { fetchFundingSources } from "../funding/sources";
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
  const [teamMembers, proposals] = await Promise.all([
    listTeamMembers(),
    listProposals(),
  ]);

  const scored = sourceResult.opportunities
    .map((opportunity) => scoreOpportunity(profile, opportunity, 0))
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .map((opportunity, index) => ({
      ...opportunity,
      rank: index + 1,
    }));

  const llmMatchLimit = getLlmMatchLimit();
  const matches = [];

  for (const [index, opportunity] of scored.entries()) {
    const teamRecommendation = recommendTeam(opportunity, teamMembers);
    const proposalRecommendation = recommendProposal(
      opportunity,
      proposals,
      teamRecommendation,
    );

    if (index >= llmMatchLimit) {
      matches.push({
        ...opportunity,
        teamRecommendation,
        proposalRecommendation,
      });
      continue;
    }

    const plan = await generateGrantPlan(profile, opportunity);

    if (plan.warning) {
      warnings.push(plan.warning);
    }

    matches.push({
      ...opportunity,
      eligibilityNotes: plan.eligibilityNotes,
      actionPlan: plan.actionPlan,
      planSummary: plan.planSummary,
      llmProvider: plan.provider,
      teamRecommendation,
      proposalRecommendation,
    });
  }

  const durationMs = Date.now() - startedAt;
  const saveResult = await saveRadarRun(profile, matches, {
    dataMode: sourceResult.dataMode,
    warnings: dedupeWarnings(warnings),
    durationMs,
    sourceStatuses: sourceResult.sourceStatuses,
  });

  if (saveResult.warning) {
    warnings.push(saveResult.warning);
    logWarn("radar.run.save_skipped", { code: saveResult.warning.code });
  }

  logInfo("radar.run.completed", {
    durationMs,
    matches: matches.length,
    warnings: warnings.length,
    saved: saveResult.saved,
    dataMode: sourceResult.dataMode,
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
      dataMode: sourceResult.dataMode,
      sourceStatuses: sourceResult.sourceStatuses,
    },
  };
}

function getLlmMatchLimit() {
  const parsed = Number.parseInt(process.env.LLM_MAX_MATCHES ?? "1", 10);

  if (Number.isNaN(parsed)) {
    return 1;
  }

  return Math.max(0, Math.min(5, parsed));
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
