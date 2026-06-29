import { createHash } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import type {
  AgentWarning,
  DataMode,
  FundingOpportunity,
  RankedOpportunity,
  ResearchProfile,
  SourceStatus,
} from "@/lib/agent/types";
import { normalizeOpportunity } from "@/lib/funding/normalize";
import { getDb } from "./client";
import {
  manualOpportunities,
  matches,
  opportunities,
  profiles,
  radarRuns,
  sourceCache,
} from "./schema";

export type SaveRunMetadata = {
  dataMode: DataMode;
  warnings: AgentWarning[];
  durationMs: number;
  sourceStatuses: SourceStatus[];
};

export type SaveResult = {
  saved: boolean;
  runId?: string;
  warning?: AgentWarning;
};

export async function saveRadarRun(
  profile: ResearchProfile,
  rankedMatches: RankedOpportunity[],
  metadata?: SaveRunMetadata,
): Promise<SaveResult> {
  const db = getDb();

  if (!db) {
    return {
      saved: false,
      warning: {
        code: "DB_NOT_CONFIGURED",
        message: "DATABASE_URL is not configured; results were returned but not persisted.",
      },
    };
  }

  try {
    const [profileRow] = await db
      .insert(profiles)
      .values({
        fingerprint: fingerprintProfile(profile),
        rawProfile: profile,
      })
      .returning({ id: profiles.id });

    for (const match of rankedMatches) {
      const [opportunityRow] = await db
        .insert(opportunities)
        .values({
          source: match.source,
          externalId: match.externalId,
          title: match.title,
          funder: match.funder,
          url: match.url,
          deadline: match.deadline,
          summary: match.summary,
          eligibility: match.eligibility,
          raw: match,
        })
        .returning({ id: opportunities.id });

      await db.insert(matches).values({
        profileId: profileRow.id,
        opportunityId: opportunityRow.id,
        score: match.score,
        rationale: match.rationale,
        eligibilityNotes: match.eligibilityNotes,
        actionPlan: match.actionPlan,
      });
    }

    const [run] = await db
      .insert(radarRuns)
      .values({
        profile,
        rankedMatches,
        selectedMatch: rankedMatches[0],
        dataMode: metadata?.dataMode ?? rankedMatches[0]?.dataMode ?? "seed",
        warnings: metadata?.warnings ?? [],
        durationMs: metadata?.durationMs ?? 0,
        sourceStatuses: metadata?.sourceStatuses ?? [],
      })
      .returning({ id: radarRuns.id });

    return {
      saved: true,
      runId: run.id,
    };
  } catch {
    return {
      saved: false,
      warning: {
        code: "DB_SAVE_ERROR",
        message: "Database persistence failed; results were returned without being saved.",
      },
    };
  }
}

export async function listSavedOpportunities(limit = 25) {
  const db = getDb();

  if (!db) {
    return {
      items: [],
      warning: {
        code: "DB_NOT_CONFIGURED",
        message: "DATABASE_URL is not configured; no saved opportunities can be listed.",
      },
    };
  }

  const rows = await db
    .select({
      id: matches.id,
      score: matches.score,
      status: matches.status,
      createdAt: matches.createdAt,
      title: opportunities.title,
      funder: opportunities.funder,
      deadline: opportunities.deadline,
      url: opportunities.url,
      actionPlan: matches.actionPlan,
      eligibilityNotes: matches.eligibilityNotes,
    })
    .from(matches)
    .innerJoin(opportunities, eq(matches.opportunityId, opportunities.id))
    .orderBy(desc(matches.createdAt))
    .limit(limit);

  return {
    items: rows,
  };
}

export async function listRadarRuns(search = "", limit = 20) {
  const db = getDb();

  if (!db) {
    return {
      items: [],
      warning: {
        code: "DB_NOT_CONFIGURED",
        message: "DATABASE_URL is not configured; search history is unavailable.",
      },
    };
  }

  const searchTerm = search.trim().toLowerCase();
  const rows = await db
    .select()
    .from(radarRuns)
    .where(
      searchTerm
        ? sql`lower((${radarRuns.profile})::text || ' ' || (${radarRuns.rankedMatches})::text) like ${`%${searchTerm}%`}`
        : undefined,
    )
    .orderBy(desc(radarRuns.createdAt))
    .limit(limit);

  return {
    items: rows,
  };
}

export async function getRadarRun(id: string) {
  const db = getDb();

  if (!db) {
    return null;
  }

  const [run] = await db
    .select()
    .from(radarRuns)
    .where(eq(radarRuns.id, id))
    .limit(1);

  return run ?? null;
}

export async function deleteRadarRun(id: string) {
  const db = getDb();

  if (!db) {
    return false;
  }

  await db.delete(radarRuns).where(eq(radarRuns.id, id));
  return true;
}

export async function saveSourceCache(
  sourceKey: string,
  label: string,
  sourceUrl: string,
  sourceOpportunities: FundingOpportunity[],
) {
  const db = getDb();

  if (!db) {
    return;
  }

  await db
    .insert(sourceCache)
    .values({
      sourceKey,
      label,
      sourceUrl,
      opportunities: sourceOpportunities,
    })
    .onConflictDoUpdate({
      target: sourceCache.sourceKey,
      set: {
        label,
        sourceUrl,
        opportunities: sourceOpportunities,
        retrievedAt: new Date(),
      },
    });
}

export async function getCachedOpportunities(sourceKeys: string[]) {
  const db = getDb();

  if (!db || sourceKeys.length === 0) {
    return {
      opportunities: [],
    };
  }

  const rows = await db
    .select()
    .from(sourceCache)
    .where(sql`${sourceCache.sourceKey} = any(${sourceKeys})`)
    .orderBy(desc(sourceCache.retrievedAt));

  return {
    opportunities: rows.flatMap((row) =>
      row.opportunities.map((opportunity) => ({
        ...opportunity,
        isLive: false,
        dataMode: "cached" as const,
      })),
    ),
  };
}

export async function listSourceCache() {
  const db = getDb();

  if (!db) {
    return [];
  }

  return db.select().from(sourceCache).orderBy(desc(sourceCache.retrievedAt));
}

export async function listManualFundingOpportunities() {
  const db = getDb();

  if (!db) {
    return [];
  }

  const rows = await db
    .select()
    .from(manualOpportunities)
    .where(eq(manualOpportunities.isActive, "true"))
    .orderBy(desc(manualOpportunities.updatedAt));

  return rows.map((row) => ({
    ...row.raw,
    isLive: false,
    dataMode: "cached" as const,
    retrievedAt: row.updatedAt.toISOString(),
  }));
}

export async function listManualOpportunityRows() {
  const db = getDb();

  if (!db) {
    return [];
  }

  return db
    .select()
    .from(manualOpportunities)
    .orderBy(desc(manualOpportunities.updatedAt));
}

export async function createManualOpportunity(input: ManualOpportunityInput) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const raw = normalizeManualOpportunity(input);
  const [row] = await db
    .insert(manualOpportunities)
    .values({
      title: raw.title,
      funder: raw.funder,
      url: raw.url,
      deadline: raw.deadline,
      amount: raw.amount,
      regionEligibility: raw.regionEligibility,
      careerStageEligibility: raw.careerStageEligibility,
      topics: raw.topics,
      description: raw.description,
      raw,
    })
    .returning();

  return row;
}

export async function updateManualOpportunity(
  id: string,
  input: ManualOpportunityInput,
) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const raw = normalizeManualOpportunity(input, id);
  const [row] = await db
    .update(manualOpportunities)
    .set({
      title: raw.title,
      funder: raw.funder,
      url: raw.url,
      deadline: raw.deadline,
      amount: raw.amount,
      regionEligibility: raw.regionEligibility,
      careerStageEligibility: raw.careerStageEligibility,
      topics: raw.topics,
      description: raw.description,
      raw,
      updatedAt: new Date(),
    })
    .where(eq(manualOpportunities.id, id))
    .returning();

  return row;
}

export type ManualOpportunityInput = {
  title: string;
  funder: string;
  url: string;
  deadline: string;
  amount: string;
  regionEligibility: string;
  careerStageEligibility: string;
  topics: string[];
  description: string;
};

function normalizeManualOpportunity(
  input: ManualOpportunityInput,
  id = input.title,
): FundingOpportunity {
  return normalizeOpportunity(
    {
      externalId: id,
      title: input.title,
      shortName: input.title,
      funder: input.funder,
      url: input.url,
      deadline: input.deadline,
      amount: input.amount,
      region: input.regionEligibility,
      regionEligibility: input.regionEligibility,
      careerStageEligibility: input.careerStageEligibility,
      focus: input.topics.join(", "),
      summary: input.description,
      description: input.description,
      eligibility: `${input.regionEligibility} ${input.careerStageEligibility}`,
      tags: ["Manual", ...input.topics].slice(0, 6),
      topics: input.topics,
      isLive: false,
      dataMode: "cached",
      baseScore: 60,
    },
    {
      source: "Manual admin opportunity",
      sourceUrl: input.url,
      dataMode: "cached",
      isLive: false,
    },
  );
}

function fingerprintProfile(profile: ResearchProfile) {
  return createHash("sha256")
    .update(JSON.stringify(profile))
    .digest("hex")
    .slice(0, 24);
}
