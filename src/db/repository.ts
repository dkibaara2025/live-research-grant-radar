import { createHash } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import type {
  AgentWarning,
  DataMode,
  FundingOpportunity,
  RankedOpportunity,
  ResearchProfile,
  SourceStatus,
  TeamMember,
  ProposalRecord,
} from "@/lib/agent/types";
import { normalizeOpportunity } from "@/lib/funding/normalize";
import { getDb } from "./client";
import {
  manualOpportunities,
  matches,
  opportunities,
  proposals,
  profiles,
  radarRuns,
  sourceCache,
  teamMembers,
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
          sourceName: match.sourceName,
          sourceType: match.sourceType,
          callUrl: match.callUrl,
          applicationUrl: match.applicationUrl,
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
      callUrl: opportunities.callUrl,
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
      callUrl: raw.callUrl,
      applicationUrl: raw.applicationUrl,
      funderType: raw.funderType,
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
      callUrl: raw.callUrl,
      applicationUrl: raw.applicationUrl,
      funderType: raw.funderType,
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
  callUrl: string;
  applicationUrl?: string;
  funderType: string;
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
      url: input.callUrl,
      callUrl: input.callUrl,
      applicationUrl: input.applicationUrl || input.callUrl,
      funderType: input.funderType,
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
      sourceType: "manual",
      sourceUrl: input.callUrl,
      dataMode: "cached",
      isLive: false,
    },
  );
}

export async function listTeamMembers() {
  const db = getDb();

  if (!db) {
    return [];
  }

  const rows = await db
    .select()
    .from(teamMembers)
    .orderBy(desc(teamMembers.updatedAt));

  return rows.map((row) => ({
    ...row.raw,
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function listTeamMemberRows() {
  const db = getDb();

  if (!db) {
    return [];
  }

  return db.select().from(teamMembers).orderBy(desc(teamMembers.updatedAt));
}

export async function createTeamMember(input: TeamMemberInput) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const raw = normalizeTeamMember(input);
  const [row] = await db
    .insert(teamMembers)
    .values({
      name: raw.name,
      role: raw.role,
      email: raw.email,
      scholarUrl: raw.scholarUrl,
      affiliation: raw.affiliation,
      expertise: raw.expertise,
      methods: raw.methods,
      geographies: raw.geographies,
      careerStage: raw.careerStage,
      leadershipStrength: raw.leadershipStrength,
      publicationHighlights: raw.publicationHighlights,
      implementationExperience: raw.implementationExperience,
      availability: raw.availability,
      raw,
    })
    .returning();

  return row;
}

export async function updateTeamMember(id: string, input: TeamMemberInput) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const raw = normalizeTeamMember(input, id);
  const [row] = await db
    .update(teamMembers)
    .set({
      name: raw.name,
      role: raw.role,
      email: raw.email,
      scholarUrl: raw.scholarUrl,
      affiliation: raw.affiliation,
      expertise: raw.expertise,
      methods: raw.methods,
      geographies: raw.geographies,
      careerStage: raw.careerStage,
      leadershipStrength: raw.leadershipStrength,
      publicationHighlights: raw.publicationHighlights,
      implementationExperience: raw.implementationExperience,
      availability: raw.availability,
      raw,
      updatedAt: new Date(),
    })
    .where(eq(teamMembers.id, id))
    .returning();

  return row;
}

export async function listProposals(search = "") {
  const db = getDb();

  if (!db) {
    return [];
  }

  const term = search.trim().toLowerCase();
  const rows = await db
    .select()
    .from(proposals)
    .where(
      term
        ? sql`lower(${proposals.title} || ' ' || ${proposals.projectArea} || ' ' || ${proposals.abstract} || ' ' || (${proposals.keywords})::text || ' ' || (${proposals.methods})::text || ' ' || ${proposals.geography} || ' ' || ${proposals.status}) like ${`%${term}%`}`
        : undefined,
    )
    .orderBy(desc(proposals.updatedAt));

  return rows.map((row) => ({
    ...row.raw,
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function listProposalRows(search = "") {
  const db = getDb();

  if (!db) {
    return [];
  }

  const term = search.trim().toLowerCase();

  return db
    .select()
    .from(proposals)
    .where(
      term
        ? sql`lower(${proposals.title} || ' ' || ${proposals.projectArea} || ' ' || ${proposals.abstract} || ' ' || (${proposals.keywords})::text || ' ' || (${proposals.methods})::text || ' ' || ${proposals.geography} || ' ' || ${proposals.status}) like ${`%${term}%`}`
        : undefined,
    )
    .orderBy(desc(proposals.updatedAt));
}

export async function createProposal(input: ProposalInput) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const raw = normalizeProposal(input);
  const [row] = await db
    .insert(proposals)
    .values({
      title: raw.title,
      projectArea: raw.projectArea,
      abstract: raw.abstract,
      fullText: raw.fullText,
      funderTarget: raw.funderTarget,
      previousCall: raw.previousCall,
      status: raw.status,
      year: raw.year,
      piTeam: raw.piTeam,
      keywords: raw.keywords,
      methods: raw.methods,
      geography: raw.geography,
      budgetRange: raw.budgetRange,
      fileName: raw.fileName,
      raw,
    })
    .returning();

  return row;
}

export async function updateProposal(id: string, input: ProposalInput) {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const raw = normalizeProposal(input, id);
  const [row] = await db
    .update(proposals)
    .set({
      title: raw.title,
      projectArea: raw.projectArea,
      abstract: raw.abstract,
      fullText: raw.fullText,
      funderTarget: raw.funderTarget,
      previousCall: raw.previousCall,
      status: raw.status,
      year: raw.year,
      piTeam: raw.piTeam,
      keywords: raw.keywords,
      methods: raw.methods,
      geography: raw.geography,
      budgetRange: raw.budgetRange,
      fileName: raw.fileName,
      raw,
      updatedAt: new Date(),
    })
    .where(eq(proposals.id, id))
    .returning();

  return row;
}

export async function deleteProposal(id: string) {
  const db = getDb();

  if (!db) {
    return false;
  }

  await db.delete(proposals).where(eq(proposals.id, id));
  return true;
}

export async function getAdminStats() {
  const db = getDb();

  if (!db) {
    return {
      manualOpportunities: 0,
      teamMembers: 0,
      proposals: 0,
      radarRuns: 0,
      missingCallLinks: 0,
      latestSourceRefresh: null,
    };
  }

  const [manualCount] = await db.select({ count: sql<number>`count(*)` }).from(manualOpportunities);
  const [teamCount] = await db.select({ count: sql<number>`count(*)` }).from(teamMembers);
  const [proposalCount] = await db.select({ count: sql<number>`count(*)` }).from(proposals);
  const [runCount] = await db.select({ count: sql<number>`count(*)` }).from(radarRuns);
  const [missingCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(opportunities)
    .where(sql`${opportunities.callUrl} = 'missing' or ${opportunities.callUrl} = ''`);
  const [latestCache] = await db
    .select()
    .from(sourceCache)
    .orderBy(desc(sourceCache.retrievedAt))
    .limit(1);

  return {
    manualOpportunities: Number(manualCount?.count ?? 0),
    teamMembers: Number(teamCount?.count ?? 0),
    proposals: Number(proposalCount?.count ?? 0),
    radarRuns: Number(runCount?.count ?? 0),
    missingCallLinks: Number(missingCount?.count ?? 0),
    latestSourceRefresh: latestCache?.retrievedAt.toISOString() ?? null,
  };
}

export type TeamMemberInput = Omit<TeamMember, "id" | "createdAt" | "updatedAt">;

export type ProposalInput = Omit<ProposalRecord, "id" | "createdAt" | "updatedAt">;

function normalizeTeamMember(input: TeamMemberInput, id = input.name): TeamMember {
  return {
    id,
    name: input.name,
    role: input.role,
    email: input.email,
    scholarUrl: input.scholarUrl,
    affiliation: input.affiliation,
    expertise: input.expertise,
    methods: input.methods,
    geographies: input.geographies,
    careerStage: input.careerStage,
    leadershipStrength: input.leadershipStrength,
    publicationHighlights: input.publicationHighlights,
    implementationExperience: input.implementationExperience,
    availability: input.availability,
  };
}

function normalizeProposal(input: ProposalInput, id = input.title): ProposalRecord {
  return {
    id,
    title: input.title,
    projectArea: input.projectArea,
    abstract: input.abstract,
    fullText: input.fullText,
    funderTarget: input.funderTarget,
    previousCall: input.previousCall,
    status: input.status,
    year: input.year,
    piTeam: input.piTeam,
    keywords: input.keywords,
    methods: input.methods,
    geography: input.geography,
    budgetRange: input.budgetRange,
    fileName: input.fileName,
  };
}

function fingerprintProfile(profile: ResearchProfile) {
  return createHash("sha256")
    .update(JSON.stringify(profile))
    .digest("hex")
    .slice(0, 24);
}
