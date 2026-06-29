alter table team_members
  add column if not exists full_name text not null default '',
  add column if not exists preferred_role text not null default 'Other',
  add column if not exists institution text,
  add column if not exists department text,
  add column if not exists country text,
  add column if not exists region text,
  add column if not exists google_scholar_url text,
  add column if not exists orcid_url text,
  add column if not exists personal_website_url text,
  add column if not exists expertise_keywords jsonb not null default '[]'::jsonb,
  add column if not exists domain_expertise jsonb not null default '[]'::jsonb,
  add column if not exists methods_expertise jsonb not null default '[]'::jsonb,
  add column if not exists geographic_experience jsonb not null default '[]'::jsonb,
  add column if not exists short_bio text,
  add column if not exists publication_summary text,
  add column if not exists selected_publications jsonb not null default '[]'::jsonb,
  add column if not exists h_index integer,
  add column if not exists citation_count integer,
  add column if not exists notes text;

update team_members
set
  full_name = case when full_name = '' then name else full_name end,
  preferred_role = case when preferred_role = 'Other' then role else preferred_role end,
  google_scholar_url = coalesce(google_scholar_url, scholar_url),
  expertise_keywords = case when expertise_keywords = '[]'::jsonb then expertise else expertise_keywords end,
  domain_expertise = case when domain_expertise = '[]'::jsonb then expertise else domain_expertise end,
  methods_expertise = case when methods_expertise = '[]'::jsonb then methods else methods_expertise end,
  geographic_experience = case when geographic_experience = '[]'::jsonb then geographies else geographic_experience end,
  publication_summary = coalesce(publication_summary, publication_highlights),
  short_bio = coalesce(short_bio, implementation_experience),
  notes = coalesce(notes, availability);

create index if not exists team_members_full_name_idx
  on team_members (full_name);

create index if not exists team_members_preferred_role_idx
  on team_members (preferred_role);
