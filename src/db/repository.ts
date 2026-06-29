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

export async function listTeamMembers(search = "") {
  const db = getDb();

  if (!db) {
    return [];
  }

  const term = search.trim().toLowerCase();
  const rows = await db
    .select()
    .from(teamMembers)
    .where(
      term
        ? sql`lower(${teamMembers.fullName} || ' ' || ${teamMembers.preferredRole} || ' ' || coalesce(${teamMembers.institution}, '') || ' ' || coalesce(${teamMembers.country}, '') || ' ' || coalesce(${teamMembers.careerStage}, '') || ' ' || (${teamMembers.expertiseKeywords})::text || ' ' || (${teamMembers.domainExpertise})::text || ' ' || (${teamMembers.methodsExpertise})::text || ' ' || (${teamMembers.geographicExperience})::text) like ${`%${term}%`}`
        : undefined,
    )
    .orderBy(desc(teamMembers.updatedAt));

  return rows.map(normalizeTeamMemberRow);
}

export async function listTeamMemberRows(search = "") {
  const db = getDb();

  if (!db) {
    return [];
  }

  return listTeamMembers(search);
}

export async function getTeamMember(id: string) {
  const db = getDb();

  if (!db) {
    return null;
  }

  const [row] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.id, id))
    .limit(1);

  return row ? normalizeTeamMemberRow(row) : null;
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
      name: raw.fullName,
      role: raw.preferredRole,
      fullName: raw.fullName,
      preferredRole: raw.preferredRole,
      institution: raw.institution,
      department: raw.department,
      country: raw.country,
      region: raw.region,
      email: raw.email,
      scholarUrl: raw.googleScholarUrl,
      googleScholarUrl: raw.googleScholarUrl,
      orcidUrl: raw.orcidUrl,
      personalWebsiteUrl: raw.personalWebsiteUrl,
      affiliation: raw.institution,
      expertise: raw.expertiseKeywords,
      expertiseKeywords: raw.expertiseKeywords,
      domainExpertise: raw.domainExpertise,
      methods: raw.methodsExpertise,
      methodsExpertise: raw.methodsExpertise,
      geographies: raw.geographicExperience,
      geographicExperience: raw.geographicExperience,
      careerStage: raw.careerStage,
      leadershipStrength: raw.notes || raw.preferredRole,
      shortBio: raw.shortBio,
      publicationHighlights: raw.publicationSummary || "Publication metadata not entered.",
      publicationSummary: raw.publicationSummary,
      selectedPublications: raw.selectedPublications,
      hIndex: raw.hIndex,
      citationCount: raw.citationCount,
      implementationExperience: raw.shortBio || raw.notes || "Needs manual verification.",
      availability: raw.notes || "Needs manual verification.",
      notes: raw.notes,
      raw,
    })
    .returning();

  return normalizeTeamMemberRow(row);
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
      name: raw.fullName,
      role: raw.preferredRole,
      fullName: raw.fullName,
      preferredRole: raw.preferredRole,
      institution: raw.institution,
      department: raw.department,
      country: raw.country,
      region: raw.region,
      email: raw.email,
      scholarUrl: raw.googleScholarUrl,
      googleScholarUrl: raw.googleScholarUrl,
      orcidUrl: raw.orcidUrl,
      personalWebsiteUrl: raw.personalWebsiteUrl,
      affiliation: raw.institution,
      expertise: raw.expertiseKeywords,
      expertiseKeywords: raw.expertiseKeywords,
      domainExpertise: raw.domainExpertise,
      methods: raw.methodsExpertise,
      methodsExpertise: raw.methodsExpertise,
      geographies: raw.geographicExperience,
      geographicExperience: raw.geographicExperience,
      careerStage: raw.careerStage,
      leadershipStrength: raw.notes || raw.preferredRole,
      shortBio: raw.shortBio,
      publicationHighlights: raw.publicationSummary || "Publication metadata not entered.",
      publicationSummary: raw.publicationSummary,
      selectedPublications: raw.selectedPublications,
      hIndex: raw.hIndex,
      citationCount: raw.citationCount,
      implementationExperience: raw.shortBio || raw.notes || "Needs manual verification.",
      availability: raw.notes || "Needs manual verification.",
      notes: raw.notes,
      raw,
      updatedAt: new Date(),
    })
    .where(eq(teamMembers.id, id))
    .returning();

  return row ? normalizeTeamMemberRow(row) : null;
}

export async function deleteTeamMember(id: string) {
  const db = getDb();

  if (!db) {
    return false;
  }

  await db.delete(teamMembers).where(eq(teamMembers.id, id));
  return true;
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

function normalizeTeamMember(input: TeamMemberInput, id = input.fullName): TeamMember {
  return {
    id,
    fullName: input.fullName,
    preferredRole: input.preferredRole,
    institution: blankToUndefined(input.institution),
    department: blankToUndefined(input.department),
    country: blankToUndefined(input.country),
    region: blankToUndefined(input.region),
    email: blankToUndefined(input.email),
    googleScholarUrl: blankToUndefined(input.googleScholarUrl),
    orcidUrl: blankToUndefined(input.orcidUrl),
    personalWebsiteUrl: blankToUndefined(input.personalWebsiteUrl),
    expertiseKeywords: input.expertiseKeywords,
    domainExpertise: input.domainExpertise,
    methodsExpertise: input.methodsExpertise,
    geographicExperience: input.geographicExperience,
    careerStage: input.careerStage,
    shortBio: blankToUndefined(input.shortBio),
    publicationSummary: blankToUndefined(input.publicationSummary),
    selectedPublications: input.selectedPublications,
    hIndex: input.hIndex,
    citationCount: input.citationCount,
    notes: blankToUndefined(input.notes),
  };
}

function normalizeTeamMemberRow(row: typeof teamMembers.$inferSelect): TeamMember {
  const raw = row.raw as Partial<TeamMember> & {
    name?: string;
    role?: TeamMember["preferredRole"] | string;
    scholarUrl?: string;
    expertise?: string[];
    methods?: string[];
    geographies?: string[];
    publicationHighlights?: string;
    implementationExperience?: string;
  };

  return {
    id: row.id,
    fullName: row.fullName || raw.fullName || raw.name || row.name,
    preferredRole: normalizePreferredRole(row.preferredRole || raw.preferredRole || raw.role || row.role),
    institution: row.institution ?? raw.institution,
    department: row.department ?? raw.department,
    country: row.country ?? raw.country,
    region: row.region ?? raw.region,
    email: row.email ?? raw.email,
    googleScholarUrl: row.googleScholarUrl ?? raw.googleScholarUrl ?? raw.scholarUrl ?? row.scholarUrl ?? undefined,
    orcidUrl: row.orcidUrl ?? raw.orcidUrl,
    personalWebsiteUrl: row.personalWebsiteUrl ?? raw.personalWebsiteUrl,
    expertiseKeywords: nonEmptyList(row.expertiseKeywords, raw.expertiseKeywords, raw.expertise, row.expertise),
    domainExpertise: nonEmptyList(row.domainExpertise, raw.domainExpertise, raw.expertise, row.expertise),
    methodsExpertise: nonEmptyList(row.methodsExpertise, raw.methodsExpertise, raw.methods, row.methods),
    geographicExperience: nonEmptyList(row.geographicExperience, raw.geographicExperience, raw.geographies, row.geographies),
    careerStage: normalizeCareerStage(row.careerStage || raw.careerStage),
    shortBio: row.shortBio ?? raw.shortBio ?? raw.implementationExperience,
    publicationSummary: row.publicationSummary ?? raw.publicationSummary ?? raw.publicationHighlights,
    selectedPublications: nonEmptyList(row.selectedPublications, raw.selectedPublications),
    hIndex: row.hIndex ?? raw.hIndex,
    citationCount: row.citationCount ?? raw.citationCount,
    notes: row.notes ?? raw.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizePreferredRole(value?: string): TeamMember["preferredRole"] {
  const allowed: TeamMember["preferredRole"][] = [
    "PI",
    "Co-PI",
    "Co-Investigator",
    "Mentor",
    "Technical Lead",
    "Statistician",
    "Field Lead",
    "Policy Lead",
    "Other",
  ];

  if (!value) {
    return "Other";
  }

  const normalized = allowed.find(
    (role) => role.toLowerCase() === value.toLowerCase(),
  );

  if (normalized) {
    return normalized;
  }

  if (value.toLowerCase().includes("principal") || value.toLowerCase() === "pi") {
    return "PI";
  }

  if (value.toLowerCase().includes("co")) {
    return "Co-Investigator";
  }

  return "Other";
}

function normalizeCareerStage(value?: string): TeamMember["careerStage"] {
  const allowed: TeamMember["careerStage"][] = [
    "Early-career",
    "Mid-career",
    "Senior",
    "Professor",
    "Practitioner",
    "Other",
  ];

  if (!value) {
    return "Other";
  }

  return (
    allowed.find((stage) => stage.toLowerCase() === value.toLowerCase()) ??
    "Other"
  );
}

function nonEmptyList(...lists: Array<string[] | undefined | null>) {
  for (const list of lists) {
    const clean = list?.map((item) => item.trim()).filter(Boolean) ?? [];

    if (clean.length > 0) {
      return clean;
    }
  }

  return [];
}

function blankToUndefined(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
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
