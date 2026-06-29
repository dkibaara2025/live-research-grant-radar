"use client";

import { useEffect, useMemo, useState } from "react";
import { scoreOpportunity } from "@/lib/agent/score";
import type {
  AgentWarning,
  DataMode,
  RadarRunResponse,
  RankedOpportunity,
  ResearchProfile,
  SourceStatus,
} from "@/lib/agent/types";
import { seedOpportunities } from "@/lib/funding/seed";
import { ActionPlanPanel } from "./action-plan-panel";
import { HistoryPanel, type HistoryRun } from "./history-panel";
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
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [dataMode, setDataMode] = useState<DataMode>("seed");
  const [generatedAt, setGeneratedAt] = useState(new Date().toISOString());
  const [sourceStatuses, setSourceStatuses] = useState<SourceStatus[]>([
    {
      key: "seed",
      label: "Demo seed fallback",
      sourceUrl: "local-seed",
      mode: "seed",
      ok: true,
      count: initialMatches.length,
      message: "Initial view uses labelled demo data until the radar runs.",
      retrievedAt: new Date().toISOString(),
    },
  ]);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyItems, setHistoryItems] = useState<HistoryRun[]>([]);

  useEffect(() => {
    void loadHistory(historyQuery);
  }, [historyQuery]);

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
        issues?: Array<{
          field: string;
          message: string;
        }>;
      };

      if (!response.ok) {
        const issueText = payload.issues?.[0]
          ? `${payload.issues[0].field}: ${payload.issues[0].message}`
          : payload.error;

        throw new Error(issueText || "Radar request failed.");
      }

      setMatches(payload.matches);
      setSelectedId(payload.matches[0]?.id ?? selectedId);
      setWarnings(payload.warnings);
      setDataMode(payload.meta.dataMode);
      setGeneratedAt(payload.meta.generatedAt);
      setSourceStatuses(payload.meta.sourceStatuses);
      setRunCount((count) => count + 1);
      setLastRun(
        `${payload.meta.opportunityCount} scanned / ${payload.meta.durationMs} ms / ${
          payload.meta.saved ? "saved" : "not saved"
        }`,
      );
      void loadHistory(historyQuery);
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

  async function loadHistory(query: string) {
    setIsHistoryLoading(true);

    try {
      const response = await fetch(`/api/history?q=${encodeURIComponent(query)}`);
      const payload = (await response.json()) as { items?: HistoryRun[] };
      setHistoryItems(payload.items ?? []);
    } catch {
      setHistoryItems([]);
    } finally {
      setIsHistoryLoading(false);
    }
  }

  function openHistoryRun(run: HistoryRun) {
    setProfile(run.profile);
    setMatches(run.rankedMatches);
    setSelectedId(run.selectedMatch?.id ?? run.rankedMatches[0]?.id ?? selectedId);
    setDataMode(run.dataMode);
    setGeneratedAt(run.createdAt);
    setWarnings([]);
    setLastRun(`Reopened saved run / ${run.durationMs} ms / ${run.dataMode}`);
  }

  return (
    <>
      <section className="source-strip" aria-label="Data source status">
        <div>
          <strong>{dataMode.toUpperCase()}</strong>
          <span>
            {sourceStatuses.reduce((total, item) => total + item.count, 0)} opportunities
            scanned across {sourceStatuses.length} source status item(s)
          </span>
        </div>
        <div className="source-status-list">
          {sourceStatuses.slice(0, 3).map((source) => (
            <span className={`source-pill ${source.mode}`} key={source.key}>
              {source.label}: {source.count}
            </span>
          ))}
        </div>
      </section>

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
          warnings={warnings}
          isLoading={isLoading}
          dataMode={dataMode}
          onSelect={setSelectedId}
        />

        <ActionPlanPanel
          opportunity={selectedOpportunity}
          profile={profile}
          dataMode={dataMode}
          generatedAt={generatedAt}
        />
      </section>

      <section className="lower-shell">
        <HistoryPanel
          items={historyItems}
          query={historyQuery}
          isLoading={isHistoryLoading}
          onQueryChange={setHistoryQuery}
          onRefresh={() => {
            void loadHistory(historyQuery);
          }}
          onOpen={openHistoryRun}
        />
      </section>
    </>
  );
}
