create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  raw_profile jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text not null,
  title text not null,
  funder text not null,
  url text not null,
  deadline text not null,
  summary text not null,
  eligibility text not null,
  raw jsonb not null,
  seen_at timestamptz not null default now()
);

create index if not exists opportunities_source_external_idx
  on opportunities (source, external_id);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  score integer not null,
  rationale jsonb not null,
  eligibility_notes text not null,
  action_plan jsonb not null,
  status text not null default 'radar',
  created_at timestamptz not null default now()
);

create index if not exists matches_created_at_idx
  on matches (created_at);
