# Live Research Grant Radar

Live Research Grant Radar is a deployed Next.js app that turns a research profile into ranked funding opportunities, eligibility notes, score explanations, saved search history, and a one-page application action plan that can be exported to PDF.

The app is designed to run on free tiers: Vercel Hobby, Neon Free Postgres, GitHub Actions, and optional Gemini Developer API.

## What It Does

- Accepts a research profile.
- Pulls opportunities from configured free/public sources.
- Uses Grants.gov public search when `FUNDING_FEEDS` includes `grants-gov` or `grants-gov:keyword`.
- Supports generic JSON and RSS/Atom feed URLs.
- Falls back to cached database source data if live feeds fail.
- Falls back to clearly labelled demo seed data only when no live/cached/manual records are available.
- Scores opportunities with factor-level explanations.
- Saves radar runs and lets users search/reopen history.
- Exports the selected one-page plan through browser print/save-as-PDF.
- Provides `/admin` for manual opportunity maintenance and source refresh.

## Architecture

- Frontend: Next.js App Router and React components in `src/components`.
- API: `/api/radar`, `/api/history`, `/api/opportunities`, `/api/health`, `/api/admin/*`.
- Agent workflow: validate profile, fetch/normalize sources, score matches, generate action plans, persist run.
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

The admin panel can:

- View manual opportunities.
- Add a manual opportunity.
- Edit a manual opportunity.
- Refresh configured sources/cache.

Set `ADMIN_KEY` in Vercel and `.env.local` to protect admin write actions. If `ADMIN_KEY` is blank, writes are allowed and the app shows a production warning.

## PDF Export

Select a match and click `Export PDF` in the one-page plan panel. The browser print dialog opens with a print stylesheet for a clean one-page plan. Choose “Save as PDF.”

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

## Deployment

1. Push the repository to GitHub.
2. Import the repo into Vercel.
3. Use the Next.js preset.
4. Build command: `npm run build`.
5. Install command: `npm install`.
6. Add environment variables:

```env
DATABASE_URL="your_neon_connection_string"
GEMINI_API_KEY="optional_gemini_key"
GEMINI_MODEL="gemini-2.5-flash"
FUNDING_FEEDS="grants-gov:research"
RADAR_DEMO_MODE="true"
APP_BASE_URL="https://live-research-grant-radar.vercel.app"
ADMIN_KEY="choose-a-private-admin-key"
```

7. Deploy.
8. Visit `/api/health`.
9. Run `npm run db:migrate` locally once against the Neon database if migrations have not already been applied.

## Tests

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

Tests cover scoring, normalization, invalid input validation, seed fallback labelling, and PDF export title generation.

## Known Limitations

- Grants.gov search results do not include every detail; amount and eligibility often need source verification.
- RSS/Atom feeds vary in quality, so unknown fields are marked “Needs verification.”
- Admin protection is intentionally lightweight and based on `ADMIN_KEY`, not full authentication.
- Gemini output should be reviewed before acting on a funding plan.

## Roadmap

- Scheduled source refresh.
- More official funder-specific adapters.
- CSV export.
- Per-user authentication.
- Email alerts for high-fit opportunities.
