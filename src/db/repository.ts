import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import type {
  AgentWarning,
  RankedOpportunity,
  ResearchProfile,
} from "@/lib/agent/types";
import { getDb } from "./client";
import { matches, opportunities, profiles } from "./schema";

export type SaveResult = {
  saved: boolean;
  warning?: AgentWarning;
};

export async function saveRadarRun(
  profile: ResearchProfile,
  rankedMatches: RankedOpportunity[],
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

    return {
      saved: true,
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

function fingerprintProfile(profile: ResearchProfile) {
  return createHash("sha256")
    .update(JSON.stringify(profile))
    .digest("hex")
    .slice(0, 24);
}
