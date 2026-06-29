# Live Research Grant Radar

Live Research Grant Radar is a deployed Next.js app that turns a research profile into ranked funding opportunities, visible original call links, eligibility notes, team fit recommendations, proposal adaptation guidance, and a one-page action plan that can be exported to PDF.

The app is designed to run on free tiers: Vercel Hobby, Neon Free Postgres, GitHub Actions, and optional Gemini Developer API.

## What It Does

- Accepts a research profile.
- Pulls opportunities from configured free/public sources.
- Uses Grants.gov public search when `FUNDING_FEEDS` includes `grants-gov` or `grants-gov:keyword`.
- Supports generic JSON and RSS/Atom feed URLs.
- Preserves a visible original call link for every opportunity through `callUrl`.
- Falls back to cached database source data if live feeds fail.
- Falls back to clearly labelled demo seed data only when no live/cached/manual records are available.
- Scores opportunities with factor-level explanations.
- Recommends saved team members for PI, co-I, implementation, and missing expertise roles.
- Matches saved proposal text to calls and returns adaptation checklists.
- Saves radar runs and lets users search/reopen history.
- Exports the selected one-page plan through browser print/save-as-PDF.
- Provides `/admin` for opportunities, team profiles, proposal library, source refresh, and data health.

## Architecture

- Frontend: Next.js App Router and React components in `src/components`.
- API: `/api/radar`, `/api/history`, `/api/opportunities`, `/api/health`, `/api/admin/*`.
- Agent workflow: validate profile, fetch/normalize sources, score matches, match team and proposals, generate action plans, persist run.
- Data sources: Grants.gov adapter, JSON adapter, RSS/Atom adapter, manual database records, cache, seed fallback.
- Database: Neon Postgres through Drizzle ORM plus checked-in idempotent SQL migrations.
- LLM: Gemini Developer API through server-only REST calls, with deterministic fallback.
- CI/CD: GitHub Actions plus Vercel Git deployment.

## Environment Variables

Copy `.env.example` to `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

Variables:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/db?sslmode=require"
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-2.5-flash"
LLM_MAX_MATCHES="1"
FUNDING_FEEDS="grants-gov:research"
RADAR_DEMO_MODE="true"
APP_BASE_URL="http://localhost:3000"
CRON_SECRET=""
ADMIN_KEY=""
```

Never commit `.env.local` or real secrets.

## Data Modes

- `live`: at least one configured source returned current opportunities.
- `cached`: live sources failed or were absent, but database cache/manual opportunities were available.
- `seed`: no configured source, no cache, and no manual records; the app shows labelled demo opportunities.

Seed/demo opportunities are never presented as real funding calls.

## Funding Feeds

`FUNDING_FEEDS` accepts comma, semicolon, or newline-separated entries:

```env
FUNDING_FEEDS="grants-gov:climate health,https://example.org/funding.xml,https://example.org/opportunities.json"
```

Supported entries:

- `grants-gov` or `grants-gov:keyword`: uses the public Grants.gov search endpoint `https://api.grants.gov/v1/api/search2`.
- RSS/Atom URLs ending in `.xml`, `.rss`, or `.atom`.
- JSON URLs returning an array, `{ "items": [...] }`, or `{ "opportunities": [...] }`.

JSON item fields may include:

```json
{
  "title": "Example Grant",
  "funder": "Example Funder",
  "url": "https://example.org/grant",
  "callUrl": "https://example.org/grant",
  "applicationUrl": "https://example.org/apply",
  "sourceName": "Example funding feed",
  "sourceType": "foundation",
  "deadline": "Dec 1",
  "regionEligibility": "International",
  "careerStageEligibility": "Early-career researchers",
  "amount": "Up to $100k",
  "focus": "implementation science",
  "summary": "Short opportunity summary",
  "description": "Longer description",
  "eligibility": "Who can apply",
  "tags": ["Health", "Pilot"],
  "topics": ["health", "implementation"]
}
```

If a call URL is missing, the app labels it as `missing` and adds a verification note instead of inventing a link.

## Gemini Rate Limits

`LLM_MAX_MATCHES` controls how many ranked matches call Gemini during one radar run. Keep it at `1` on the Gemini free tier. Remaining matches use local deterministic action plans, which avoids one search creating several LLM requests and triggering 429 rate limits.

If Gemini returns 429, the app shows `LLM_RATE_LIMITED` and keeps the radar usable with a deterministic fallback plan.

## Local Development

```powershell
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000`.

## Database Setup

1. Create a Neon Free project.
2. Copy the pooled Postgres connection string.
3. Paste it into `.env.local` as `DATABASE_URL`.
4. Paste it into Vercel Project Settings > Environment Variables.
5. Run migrations:

```powershell
npm run db:generate
npm run db:migrate
```

Migrations are additive/idempotent and do not require a destructive reset.

## Admin Panel

Open `/admin`.

The admin panel has five sections:

- Opportunities: add or edit manual opportunities. Every manual record requires an original call link.
- Team Profiles: create, edit, delete, and search database-backed team member profiles with Google Scholar links, ORCID links, websites, institution data, expertise, methods, geography, career stage, publication metadata, h-index, citation count, and notes.
- Proposal Library: paste proposal text and metadata for matching. No file upload is required.
- Source Refresh: refresh configured live feeds/cache.
- Data Health: review counts for manual opportunities, team members, proposals, radar runs, missing call links, and latest refresh.

Set `ADMIN_KEY` in Vercel and `.env.local` to protect admin write actions. If `ADMIN_KEY` is blank, writes are allowed and the app shows a production warning.

### Team And Proposal Matching

Team matching uses only saved manual metadata. Google Scholar links are stored and displayed as profile links; the app does not scrape Google Scholar or claim publications that were not entered by an admin.

To add a team member:

1. Open `/admin`.
2. Enter `ADMIN_KEY` if it is configured.
3. Open `Team Profiles`.
4. Fill in full name, preferred role, institution, country/region, expertise keywords, domain expertise, methods expertise, geographic experience, career stage, and manual publication metadata.
5. Paste the public Google Scholar profile URL in `Google Scholar Profile URL`.
6. Save the profile.

Saved Scholar links appear as `Open Scholar` buttons. The app also shows profile completeness, and search covers name, role, institution, expertise, method, country, and career stage.

Team matching uses `scoreTeamMemberForOpportunity(teamMember, opportunity, researchProfile)` to estimate:

- keyword overlap;
- domain expertise fit;
- methods expertise fit;
- geography fit;
- career-stage and PI suitability;
- manually entered publication relevance;
- implementation or field experience from saved notes/bio.

The wording is intentionally cautious: matches "appear aligned based on saved metadata," and Scholar/publication evidence "needs manual verification."

Proposal matching uses pasted proposal text and metadata to suggest:

- the strongest reusable proposal;
- sections that can be reused;
- sections that need rewriting;
- evidence or partner details to gather;
- a proposed package structure for the call.

Treat these outputs as planning assistance. A human should verify eligibility, call instructions, and funder requirements before submission.

## PDF Export

Select a match and click `Export PDF` in the one-page plan panel. The browser print dialog opens with a print stylesheet for a clean one-page plan. Choose "Save as PDF."

The exported plan includes the original call link, team recommendation, proposal adaptation guidance, and a next-seven-day action plan when available.

## API Examples

Run radar:

```powershell
$body = @{
  profile = @{
    field = "Climate and health systems"
    region = "Kenya"
    careerStage = "Early-career PI"
    deadlineWindow = "120 days"
    keywords = "implementation science, community health, adaptation"
    summary = "A mixed-methods project testing community health worker workflows for heat-risk screening and referral in rural counties."
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/api/radar -ContentType "application/json" -Body $body
```

Health:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/health
```

History:

```powershell
Invoke-RestMethod "http://127.0.0.1:3000/api/history?q=climate"
```

Admin stats:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/admin/stats
```

Team profiles:

```powershell
Invoke-RestMethod "http://127.0.0.1:3000/api/team-members?q=climate"
Invoke-RestMethod http://127.0.0.1:3000/api/team-members/<team-member-id>
```

## Make The Site Live

1. Push the repository to GitHub.
2. Create a Neon Free database and copy its pooled Postgres connection string.
3. Import the GitHub repo into Vercel.
4. Use the Next.js preset.
5. Set install command to `npm install`.
6. Set build command to `npm run build`.
7. Add environment variables in Vercel Project Settings:

```env
DATABASE_URL="your_neon_connection_string"
GEMINI_API_KEY="optional_gemini_key"
GEMINI_MODEL="gemini-2.5-flash"
LLM_MAX_MATCHES="1"
FUNDING_FEEDS="grants-gov:research"
RADAR_DEMO_MODE="true"
APP_BASE_URL="https://live-research-grant-radar.vercel.app"
ADMIN_KEY="choose-a-private-admin-key"
CRON_SECRET=""
```

8. Deploy in Vercel.
9. Run the checked-in migrations once from a trusted local machine with the same `DATABASE_URL`:

```powershell
npm run db:generate
npm run db:migrate
```

10. Visit `/api/health` on the Vercel URL.
11. Open `/admin`, enter the `ADMIN_KEY`, add at least one manual opportunity with a real call link, add team profiles with Google Scholar links/manual publication metadata, and paste proposal records.
12. Run a radar search from the home page and confirm each match shows an original call link or a clear missing-link verification note.

## Tests

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

Tests cover scoring, normalization, invalid input validation, valid/invalid Google Scholar team profiles, source fallback labelling, PDF export title generation, team member scoring, team matching, proposal matching, and radar output shape.

## Known Limitations

- Grants.gov search results do not include every detail; amount and eligibility often need source verification.
- RSS/Atom feeds vary in quality, so unknown fields are marked "Needs verification."
- Team and proposal recommendations are deterministic planning aids, not funder eligibility guarantees.
- Google Scholar links are stored manually; the app does not scrape or enrich Scholar data.
- Proposal text is stored in the configured database. Do not paste confidential proposal material unless that database and admin access model are appropriate for the team.
- Admin protection is intentionally lightweight and based on `ADMIN_KEY`, not full authentication.
- Gemini output should be reviewed before acting on a funding plan.

## Roadmap

- Scheduled source refresh.
- More official funder-specific adapters.
- CSV export.
- Per-user authentication.
- Email alerts for high-fit opportunities.
