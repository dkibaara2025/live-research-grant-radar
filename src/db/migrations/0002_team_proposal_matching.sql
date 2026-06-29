alter table opportunities
  add column if not exists source_name text not null default 'Unknown source',
  add column if not exists source_type text not null default 'other',
  add column if not exists call_url text not null default 'missing',
  add column if not exists application_url text not null default 'missing';

alter table manual_opportunities
  add column if not exists call_url text not null default 'missing',
  add column if not exists application_url text not null default 'missing',
  add column if not exists funder_type text not null default 'needs verification';

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  email text,
  scholar_url text,
  affiliation text,
  expertise jsonb not null,
  methods jsonb not null,
  geographies jsonb not null,
  career_stage text not null,
  leadership_strength text not null,
  publication_highlights text not null,
  implementation_experience text not null,
  availability text not null,
  raw jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_members_name_idx
  on team_members (name);

create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  project_area text not null,
  abstract text not null,
  full_text text not null,
  funder_target text,
  previous_call text,
  status text not null,
  year integer not null,
  pi_team text,
  keywords jsonb not null,
  methods jsonb not null,
  geography text not null,
  budget_range text not null,
  file_name text,
  raw jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposals_title_idx
  on proposals (title);

create index if not exists proposals_status_idx
  on proposals (status);
