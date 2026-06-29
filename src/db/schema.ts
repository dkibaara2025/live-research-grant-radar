import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  AgentWarning,
  DataMode,
  FundingOpportunity,
  RankedOpportunity,
  ResearchProfile,
  SourceStatus,
} from "@/lib/agent/types";

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  fingerprint: text("fingerprint").notNull(),
  rawProfile: jsonb("raw_profile").$type<ResearchProfile>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const opportunities = pgTable(
  "opportunities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    funder: text("funder").notNull(),
    url: text("url").notNull(),
    deadline: text("deadline").notNull(),
    summary: text("summary").notNull(),
    eligibility: text("eligibility").notNull(),
    raw: jsonb("raw").$type<RankedOpportunity>().notNull(),
    seenAt: timestamp("seen_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("opportunities_source_external_idx").on(table.source, table.externalId),
  ],
);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .references(() => profiles.id, { onDelete: "cascade" })
      .notNull(),
    opportunityId: uuid("opportunity_id")
      .references(() => opportunities.id, { onDelete: "cascade" })
      .notNull(),
    score: integer("score").notNull(),
    rationale: jsonb("rationale").$type<string[]>().notNull(),
    eligibilityNotes: text("eligibility_notes").notNull(),
    actionPlan: jsonb("action_plan").$type<string[]>().notNull(),
    status: text("status").default("radar").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("matches_created_at_idx").on(table.createdAt)],
);

export const radarRuns = pgTable(
  "radar_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profile: jsonb("profile").$type<ResearchProfile>().notNull(),
    rankedMatches: jsonb("ranked_matches").$type<RankedOpportunity[]>().notNull(),
    selectedMatch: jsonb("selected_match").$type<RankedOpportunity>(),
    dataMode: text("data_mode").$type<DataMode>().notNull(),
    warnings: jsonb("warnings").$type<AgentWarning[]>().notNull(),
    durationMs: integer("duration_ms").notNull(),
    sourceStatuses: jsonb("source_statuses").$type<SourceStatus[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("radar_runs_created_at_idx").on(table.createdAt),
    index("radar_runs_data_mode_idx").on(table.dataMode),
  ],
);

export const sourceCache = pgTable(
  "source_cache",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceKey: text("source_key").notNull(),
    label: text("label").notNull(),
    sourceUrl: text("source_url").notNull(),
    opportunities: jsonb("opportunities").$type<FundingOpportunity[]>().notNull(),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("source_cache_source_key_uidx").on(table.sourceKey)],
);

export const manualOpportunities = pgTable(
  "manual_opportunities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    funder: text("funder").notNull(),
    url: text("url").notNull(),
    deadline: text("deadline").notNull(),
    amount: text("amount").notNull(),
    regionEligibility: text("region_eligibility").notNull(),
    careerStageEligibility: text("career_stage_eligibility").notNull(),
    topics: jsonb("topics").$type<string[]>().notNull(),
    description: text("description").notNull(),
    raw: jsonb("raw").$type<FundingOpportunity>().notNull(),
    isActive: text("is_active").default("true").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("manual_opportunities_title_idx").on(table.title)],
);

export const profileRelations = relations(profiles, ({ many }) => ({
  matches: many(matches),
}));

export const opportunityRelations = relations(opportunities, ({ many }) => ({
  matches: many(matches),
}));

export const matchRelations = relations(matches, ({ one }) => ({
  profile: one(profiles, {
    fields: [matches.profileId],
    references: [profiles.id],
  }),
  opportunity: one(opportunities, {
    fields: [matches.opportunityId],
    references: [opportunities.id],
  }),
}));
