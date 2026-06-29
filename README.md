# Live Research Grant Radar

Live Research Grant Radar is a small full-stack demo app that turns a research profile into ranked funding opportunities, eligibility notes, and a one-page application action plan.

It is designed to be impressive in deployment rather than large in code: Next.js server routes, a lightweight agent workflow, optional Neon Postgres persistence, optional Gemini API generation, GitHub Actions CI, Vercel hosting, and a health endpoint.

## Architecture

- Frontend: Next.js App Router with React components in `src/components`
- API: `POST /api/radar`, `GET/POST /api/opportunities`, `GET /api/health`
- Agent: validate profile, fetch sources, score opportunities, generate plans, save results
- Database: Neon Postgres through Drizzle ORM and checked-in SQL migrations
- LLM: Gemini Developer API through a server-only REST call
- Fallbacks: seed opportunities, rule-based scoring, deterministic action plans, no-secret health checks
- CI/CD: GitHub Actions plus Vercel Git deployment

## Free Tools Used

- GitHub Free for repository hosting
- GitHub Actions for CI
- Vercel Hobby for a free `.vercel.app` deployment URL
- Neon Free for Postgres
- Gemini Developer API free tier for LLM generation

## Account Setup

Create these accounts before live deployment:

| Service | Required | Free plan | Secret to copy |
|---|---:|---|---|
| GitHub | Yes | Free | None |
| Vercel | Yes | Hobby | Environment variables copied from this project |
| Neon | For persistence | Free | `DATABASE_URL` |
| Google AI Studio | For LLM output | Free tier | `GEMINI_API_KEY` |

The app still runs locally and on Vercel without Neon or Gemini. It will show warnings and use deterministic fallbacks.

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
FUNDING_FEEDS=""
RADAR_DEMO_MODE="true"
APP_BASE_URL="http://localhost:3000"
CRON_SECRET=""
```

Never commit `.env.local` or real secrets.

## Local Development

Install dependencies:

```powershell
npm install
```

Run checks:

```powershell
npm run typecheck
npm run lint
npm run build
```

Start the app:

```powershell
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000`.

## Database Setup

1. Create a Neon Free project.
2. Copy the pooled Postgres connection string.
3. Paste it into `.env.local` as `DATABASE_URL`.
4. Paste the same value into Vercel Project Settings > Environment Variables.
5. Run:

```powershell
npm run db:generate
npm run db:migrate
```

Without `DATABASE_URL`, the app returns results but does not persist them.

## Gemini API Setup

1. Go to `https://aistudio.google.com/app/apikey`.
2. Create a Gemini API key.
3. Paste it into `.env.local` as `GEMINI_API_KEY`.
4. Paste it into Vercel Project Settings > Environment Variables.
5. Keep `GEMINI_MODEL` as `gemini-2.5-flash` unless you choose another available free-tier model.

The key is only read inside server code. It is never exposed through `NEXT_PUBLIC_*`.

## Optional Funding Feeds

`FUNDING_FEEDS` can contain comma, semicolon, or newline-separated JSON feed URLs. Each feed should return either an array, `{ "items": [...] }`, or `{ "opportunities": [...] }`.

Each item can include:

```json
{
  "title": "Example Grant",
  "funder": "Example Funder",
  "url": "https://example.org/grant",
  "deadline": "Dec 1",
  "region": "International",
  "amount": "Up to $100k",
  "focus": "implementation science",
  "summary": "Short opportunity summary",
  "eligibility": "Who can apply",
  "tags": ["Health", "Pilot"]
}
```

If no feeds are configured, the app uses built-in seed opportunities.

## API

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

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/health
```

List saved opportunities:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/opportunities
```

## Deployment

1. Create a GitHub repository named `live-research-grant-radar`.
2. Push this project:

```powershell
git remote add origin https://github.com/YOUR-USER/live-research-grant-radar.git
git branch -M main
git push -u origin main
```

3. Go to Vercel and import the GitHub repository.
4. Select the Next.js framework preset.
5. Use these settings:

```text
Install command: npm install
Build command: npm run build
Output directory: default
```

6. Add environment variables from `.env.local`.
7. Deploy.
8. Open the generated free URL, such as `https://live-research-grant-radar.vercel.app`.
9. Check `https://YOUR-APP.vercel.app/api/health`.

## Demo Steps

1. Show the GitHub repo, CI workflow, and Vercel deployment.
2. Open the public Vercel app URL.
3. Use the default Kenya climate-health profile or edit it live.
4. Click `Run radar`.
5. Show the ranked matches, warnings, persistence status, and one-page action plan.
6. Open `/api/health` to show app, database, and LLM status.
7. Explain that the app keeps working with free deterministic fallbacks if Neon or Gemini is not configured.

## Testing Plan

Manual:

- Submit the default profile.
- Shorten the profile summary and confirm validation returns an error.
- Run without `GEMINI_API_KEY` and confirm fallback warning appears.
- Run without `DATABASE_URL` and confirm results still display.
- Visit `/api/health`.

Automated checks:

```powershell
npm run typecheck
npm run lint
npm run build
```

Deployment smoke test:

```powershell
Invoke-RestMethod https://YOUR-APP.vercel.app/api/health
```

## Limitations

- Demo app has no authentication.
- Built-in seed opportunities are illustrative, not official funding advice.
- Optional live feeds currently expect simple JSON, not arbitrary web pages.
- LLM-generated plans need human review before grant submission.
- Persistence requires Neon configuration.

## Future Improvements

- Add authentication and per-user saved profiles.
- Add scheduled funding refresh with a protected cron route.
- Add PDF export for the one-page plan.
- Add more official funding source adapters.
- Add email alerts for new high-fit opportunities.
