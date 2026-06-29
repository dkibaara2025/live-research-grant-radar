"use client";

import { useMemo, useState } from "react";
import { scoreOpportunity } from "@/lib/agent/score";
import type {
  AgentWarning,
  RadarRunResponse,
  RankedOpportunity,
  ResearchProfile,
} from "@/lib/agent/types";
import { seedOpportunities } from "@/lib/funding-sources/seed";
import { ActionPlanPanel } from "./action-plan-panel";
import { ProfileForm } from "./profile-form";
import { RadarResults } from "./radar-results";

const defaultProfile: ResearchProfile = {
  field: "Climate and health systems",
  region: "Kenya",
  careerStage: "Early-career PI",
  deadlineWindow: "120 days",
  keywords: "implementation science, community health, adaptation",
  summary:
    "A mixed-methods project testing community health worker workflows for heat-risk screening and referral in rural counties.",
};

const initialMatches = seedOpportunities
  .map((opportunity) => scoreOpportunity(defaultProfile, opportunity, 0))
  .sort((left, right) => right.score - left.score)
  .slice(0, 3)
  .map((opportunity, index) => ({
    ...opportunity,
    rank: index + 1,
  }));

export function GrantRadarShell() {
  const [profile, setProfile] = useState<ResearchProfile>(defaultProfile);
  const [matches, setMatches] = useState<RankedOpportunity[]>(initialMatches);
  const [selectedId, setSelectedId] = useState(initialMatches[0].id);
  const [warnings, setWarnings] = useState<AgentWarning[]>([]);
  const [runCount, setRunCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const selectedOpportunity = useMemo(
    () =>
      matches.find((opportunity) => opportunity.id === selectedId) ??
      matches[0],
    [matches, selectedId],
  );

  const filledFields = Object.values(profile).filter((value) =>
    value.trim(),
  ).length;
  const readiness = Math.round((filledFields / Object.keys(profile).length) * 100);

  async function runRadar() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/radar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profile }),
      });
      const payload = (await response.json()) as RadarRunResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Radar request failed.");
      }

      setMatches(payload.matches);
      setSelectedId(payload.matches[0]?.id ?? selectedId);
      setWarnings(payload.warnings);
      setRunCount((count) => count + 1);
      setLastRun(
        `${payload.meta.opportunityCount} scanned / ${payload.meta.durationMs} ms / ${
          payload.meta.saved ? "saved" : "not saved"
        }`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Radar request failed.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="radar-shell" aria-label="Grant radar workspace">
      <ProfileForm
        profile={profile}
        readiness={readiness}
        runCount={runCount}
        isLoading={isLoading}
        error={error}
        lastRun={lastRun}
        onChange={setProfile}
        onSubmit={() => {
          void runRadar();
        }}
      />

      <RadarResults
        opportunities={matches}
        selectedId={selectedId}
        runCount={runCount}
        warnings={warnings}
        isLoading={isLoading}
        onSelect={setSelectedId}
      />

      <ActionPlanPanel opportunity={selectedOpportunity} profile={profile} />
    </section>
  );
}
