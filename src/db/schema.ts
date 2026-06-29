import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { RankedOpportunity, ResearchProfile } from "@/lib/agent/types";

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
