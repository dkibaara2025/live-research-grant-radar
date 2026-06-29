create table if not exists radar_runs (
  id uuid primary key default gen_random_uuid(),
  profile jsonb not null,
  ranked_matches jsonb not null,
  selected_match jsonb,
  data_mode text not null,
  warnings jsonb not null,
  duration_ms integer not null,
  source_statuses jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists radar_runs_created_at_idx
  on radar_runs (created_at);

create index if not exists radar_runs_data_mode_idx
  on radar_runs (data_mode);

create table if not exists source_cache (
  id uuid primary key default gen_random_uuid(),
  source_key text not null,
  label text not null,
  source_url text not null,
  opportunities jsonb not null,
  retrieved_at timestamptz not null default now()
);

create unique index if not exists source_cache_source_key_uidx
  on source_cache (source_key);

create table if not exists manual_opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  funder text not null,
  url text not null,
  deadline text not null,
  amount text not null,
  region_eligibility text not null,
  career_stage_eligibility text not null,
  topics jsonb not null,
  description text not null,
  raw jsonb not null,
  is_active text not null default 'true',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists manual_opportunities_title_idx
  on manual_opportunities (title);
