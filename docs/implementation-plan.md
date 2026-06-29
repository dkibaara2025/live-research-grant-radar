# Live Research Grant Radar Implementation Plan

Verified planning references:
- Vercel pricing and Hobby hosting: https://vercel.com/pricing
- Vercel Next.js deployments: https://vercel.com/docs/frameworks/nextjs
- Neon pricing and free Postgres: https://neon.com/pricing
- Gemini API pricing and rate limits: https://ai.google.dev/gemini-api/docs/pricing and https://ai.google.dev/gemini-api/docs/rate-limits
- Gemini API key setup: https://ai.google.dev/gemini-api/docs/api-key
- GitHub Actions billing: https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions

## 1. Idea Interpretation

Build a deployed web app where a researcher enters a profile, the app gathers funding opportunities from configured public sources, ranks the fit, explains eligibility, stores promising opportunities, and generates a one-page application action plan.

Smallest viable version: one profile form, one server-side radar endpoint, a source adapter that can use seed data plus public feed/API URLs, a ranking function, Gemini-generated rationale/action plan, saved matches in Postgres, and a health page.

Unique angle: it behaves like a mini funding officer. It does not merely search grants; it turns a profile into a ranked shortlist with eligibility reasoning and next actions.

Deployment impressiveness: serverless Next.js app, managed Postgres, LLM API, CI checks, environment-secret boundaries, health endpoint, structured logs, and free public deployment URL.

Assumptions:
- The MVP is an unauthenticated demo app, not a production compliance product.
- Research profiles are short and non-sensitive.
- Public funding source adapters can be refined incrementally.
- The first deployed version can fall back to seed/demo opportunities when live sources or the LLM are unavailable.

## 2. Free-Tool Feasibility Check

| Component | Recommended free tool | Why it fits | Free-tier limitation | Risk | Free fallback option |
|---|---|---|---|---|---|
| Full-stack app | Next.js | Small codebase, server routes, strong Vercel fit | Build/runtime quotas depend on host plan | Framework upgrades can change defaults | Vite + Cloudflare Pages |
| Hosting | Vercel Hobby | Free `.vercel.app` URL, GitHub auto-deploy | Hobby quotas; not for commercial heavy use | Free limits can change | Cloudflare Pages |
| Database | Neon Postgres Free | Serverless Postgres with pooled connection string | Storage/compute limits | Idle/cold starts, quota changes | Supabase Free |
| LLM | Gemini Developer API Free | Free-tier model access and API keys | Rate limits, model availability, regional terms | Free limits may change | Hugging Face free inference or local deterministic fallback |
| CI/CD | GitHub Actions + Vercel Git integration | Free for public repo Actions; automatic deploys | Private repo minutes are limited | Secret misuse in CI | Vercel-only build checks |
| Agent workflow | Custom server-side agent loop | Tiny code, transparent state, no paid orchestrator | Less visual than hosted workflow tools | Needs careful logging | LangGraph later |
| Monitoring | `/api/health` + structured logs | Free and deployable everywhere | No retention dashboard | Harder production debugging | Vercel logs |
| Secrets | `.env.local` + Vercel env vars | Standard and simple | Manual copy/paste | Accidental commits | GitHub repo secrets for CI-only values |

## 3. Target Architecture

Plain English: The browser sends a research profile to a Next.js API route. The route runs a small agent: validate input, fetch opportunities, normalize records, score fit, call Gemini for explanations/action plans, save results in Neon, and return ranked cards to the UI. Server-only routes hold all secrets.

Frontend components:
- `ProfileForm`: role, field, keywords, country/region, career stage, budget, deadline window.
- `RadarResults`: ranked opportunity list with score, funder, deadline, reasons.
- `ActionPlanPanel`: one-page plan for the selected opportunity.
- `SavedOpportunities`: stored matches from Postgres.
- `SystemStatus`: health and fallback indicators.

Backend/API routes:
- `POST /api/radar`: run the agent for one profile.
- `GET /api/opportunities`: list saved matches.
- `POST /api/opportunities`: save a match.
- `GET /api/health`: check app, database, and LLM config.

Database schema:
- `profiles`: `id`, `fingerprint`, `raw_profile`, `created_at`.
- `opportunities`: `id`, `source`, `external_id`, `title`, `funder`, `url`, `deadline`, `summary`, `eligibility`, `raw`, `seen_at`.
- `matches`: `id`, `profile_id`, `opportunity_id`, `score`, `rationale`, `eligibility_notes`, `action_plan`, `status`, `created_at`.

Agent workflow:
- State: profile, normalized opportunities, scored matches, LLM drafts, saved IDs, warnings.
- Tools: funding source fetcher, scoring function, Gemini summarizer, Postgres persistence, logger.
- Steps: validate profile, fetch sources, normalize, rank, explain, save, respond.
- Human approval: user chooses which matches to save or export.

External APIs:
- Gemini API for ranking explanations and action plan generation.
- Configurable public funding feeds/APIs via `FUNDING_FEEDS`.
- Seed opportunities as a deterministic fallback.

Environment variables:
- `DATABASE_URL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `FUNDING_FEEDS`
- `RADAR_DEMO_MODE`
- `APP_BASE_URL`
- `CRON_SECRET` optional later

Deployment pipeline:
- Push to GitHub.
- GitHub Actions runs lint, typecheck, and build.
- Vercel imports repo and deploys preview/production automatically.
- Neon provides `DATABASE_URL`.
- Vercel stores secrets as environment variables.

Security boundaries:
- No API key in browser code.
- Same-origin API routes.
- Input length limits.
- Server-side env reads only.
- Structured logs do not print secrets or full profile text.

## 4. MVP Scope

Must-have:
- Profile form.
- Server-side radar endpoint.
- Seed/demo opportunities plus configurable live feed source list.
- Fit scoring and eligibility notes.
- Gemini-generated action plan with deterministic fallback.
- Save/list opportunities in Neon.
- Health endpoint and README deployment guide.

Should-have:
- Source badges and fallback warnings.
- Exportable one-page action plan.
- Basic API tests.
- CI workflow.

Nice-to-have:
- Auth.
- Scheduled refresh.
- Email alerts.
- Multi-profile workspaces.
- LangGraph visual workflow.

Do-not-build-yet:
- Paid search APIs.
- Custom domain.
- Complex CRM.
- Full grant-writing assistant.
- Sensitive document upload.

## 5. Codebase Structure

```text
.
├── docs/implementation-plan.md
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/route.ts
│   │   │   ├── opportunities/route.ts
│   │   │   └── radar/route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── action-plan-panel.tsx
│   │   ├── profile-form.tsx
│   │   └── radar-results.tsx
│   ├── db/
│   │   ├── client.ts
│   │   ├── schema.ts
│   │   └── migrations/
│   ├── lib/
│   │   ├── agent/
│   │   │   ├── run-radar.ts
│   │   │   ├── score.ts
│   │   │   └── types.ts
│   │   ├── funding-sources/
│   │   │   ├── seed.ts
│   │   │   └── sources.ts
│   │   ├── gemini.ts
│   │   ├── logger.ts
│   │   └── validation.ts
│   └── test/
├── .env.example
├── .github/workflows/ci.yml
├── next.config.mjs
├── package.json
├── scripts/
│   ├── check-migrations.mjs
│   └── migrate.mjs
├── README.md
└── tsconfig.json
```

Important file purposes:
- `src/app/page.tsx`: main demo experience.
- `src/app/api/radar/route.ts`: server-only agent entry point.
- `src/db/schema.ts`: typed Postgres tables.
- `src/lib/agent/run-radar.ts`: orchestrates the workflow.
- `src/lib/gemini.ts`: hides LLM provider details and fallback.
- `.env.example`: safe list of variables without real secrets.
- `.github/workflows/ci.yml`: free CI checks.

## 6. Implementation Tasks For Codex

Task 1: Initialize project
- Goal: Create a minimal Next.js TypeScript scaffold and planning artifact.
- Files: `package.json`, `tsconfig.json`, `next.config.mjs`, `eslint.config.mjs`, `.gitignore`, `.env.example`, `src/app/*`, `docs/implementation-plan.md`.
- Acceptance criteria: app starts locally, typecheck passes, lint passes, build passes.
- Test command: `npm install`, `npm run typecheck`, `npm run lint`, `npm run build`.
- Commit message: `chore: initialize research grant radar app`

Task 2: Build UI shell
- Goal: Add the profile form and mock results layout.
- Files: `src/app/page.tsx`, `src/components/*`, `src/app/globals.css`.
- Acceptance criteria: user can enter a profile and view static ranked cards.
- Test command: `npm run typecheck && npm run lint`.
- Commit message: `feat: add grant radar ui shell`

Task 3: Add API endpoint
- Goal: Add `POST /api/radar` with validation and mock response.
- Files: `src/app/api/radar/route.ts`, `src/lib/validation.ts`, `src/lib/agent/types.ts`.
- Acceptance criteria: invalid input returns 400; valid input returns ranked opportunities.
- Test command: `npm run build`.
- Commit message: `feat: add radar api endpoint`

Task 4: Add database layer
- Goal: Add Neon/Drizzle schema and save/list endpoints.
- Files: `src/db/*`, `scripts/*`, `src/app/api/opportunities/route.ts`.
- Acceptance criteria: migrations run and saved opportunities persist.
- Test command: `npm run db:generate`, `npm run db:migrate`, `npm run build`.
- Commit message: `feat: persist grant opportunities`

Task 5: Add LLM integration
- Goal: Add Gemini explanation and action-plan generation.
- Files: `src/lib/gemini.ts`, `src/lib/agent/run-radar.ts`.
- Acceptance criteria: server uses `GEMINI_API_KEY`; no key is exposed client-side; fallback works.
- Test command: `npm run build`.
- Commit message: `feat: generate llm grant action plans`

Task 6: Add agent workflow
- Goal: Implement the full validate-fetch-score-explain-save workflow.
- Files: `src/lib/agent/*`, `src/lib/funding-sources/*`, API route.
- Acceptance criteria: response includes state warnings, ranked matches, and action plans.
- Test command: `npm run build`.
- Commit message: `feat: add grant radar agent workflow`

Task 7: Add deployment configuration
- Goal: Add GitHub Actions and Vercel-ready settings.
- Files: `.github/workflows/ci.yml`, `vercel.json` if needed.
- Acceptance criteria: CI passes on push; Vercel build command works.
- Test command: `npm run build`.
- Commit message: `ci: add deployment checks`

Task 8: Add health check and logging
- Goal: Add `/api/health` and structured server logs.
- Files: `src/app/api/health/route.ts`, `src/lib/logger.ts`.
- Acceptance criteria: health endpoint reports app, db config, llm config without leaking secrets.
- Test command: `npm run build`.
- Commit message: `feat: add health check and structured logs`

Task 9: Add README and demo instructions
- Goal: Add beginner setup, deployment, and demo guide.
- Files: `README.md`.
- Acceptance criteria: non-expert can deploy from the document.
- Test command: `npm run build`.
- Commit message: `docs: add setup and demo guide`

Task 10: Final deployment verification
- Goal: Verify production URL, health endpoint, and one full radar run.
- Files: deployment notes only unless fixes are needed.
- Acceptance criteria: public `.vercel.app` URL works and demo script succeeds.
- Test command: `curl <production-url>/api/health`.
- Commit message: `chore: verify deployment`

## 7. Local Setup Instructions

Install prerequisites:
```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
```

Clone and install:
```powershell
git clone https://github.com/YOUR-USER/live-research-grant-radar.git
cd live-research-grant-radar
npm install
Copy-Item .env.example .env.local
```

Create `.env.local`, then run:
```powershell
npm run typecheck
npm run lint
npm run build
npm run dev
```

Run migrations after the database task exists:
```powershell
npm run db:migrate
```

Open `http://localhost:3000`.

## 8. Deployment Instructions

Create GitHub repository:
1. Create a repo named `live-research-grant-radar`.
2. Public is recommended for free GitHub Actions minutes.
3. Push code:
```powershell
git remote add origin https://github.com/YOUR-USER/live-research-grant-radar.git
git branch -M main
git push -u origin main
```

Create Vercel project:
1. Sign in to Vercel.
2. Import the GitHub repo.
3. Framework preset: Next.js.
4. Build command: `npm run build`.
5. Output directory: leave default.
6. Add env vars from `.env.local`.
7. Deploy.
8. Copy the generated `https://<project>.vercel.app` URL.

Test deployed app:
```powershell
curl https://<project>.vercel.app/api/health
```

## 9. Free LLM API Setup

Use Gemini Developer API:
1. Go to https://aistudio.google.com/app/apikey.
2. Sign in with a Google account.
3. Create an API key.
4. Copy it once and store it in `.env.local` as `GEMINI_API_KEY`.
5. Add the same key to Vercel project environment variables.

Rate-limit handling:
- Keep prompts short.
- Limit profile length.
- Retry once on transient failure.
- If rate-limited, return deterministic score/rationale from local rules.

Fallback behavior:
- No key: use deterministic action plan template.
- API error: include warning and continue with rule-based result.
- Timeout: return cached/seed opportunity ranking where possible.

Browser safety:
- Never prefix the key with `NEXT_PUBLIC_`.
- Only read the key in server routes or server-only libraries.
- Do not log prompt bodies or response payloads containing sensitive user input.

## 10. Agentic Workflow Design

Agent goal: turn a research profile into ranked, explainable funding opportunities and one-page next-action plans.

Agent state:
- `profile`
- `sourceRuns`
- `opportunities`
- `matches`
- `warnings`
- `logs`

Agent tools:
- `fetchFundingSources`
- `scoreOpportunity`
- `generateActionPlan`
- `saveMatches`
- `logEvent`

Agent steps:
1. Validate profile.
2. Fetch configured live sources and seed fallback.
3. Normalize opportunities.
4. Score fit with transparent rules.
5. Ask Gemini to explain top matches.
6. Save results if database is configured.
7. Return ranked cards and warnings.

Human approval points:
- User chooses which opportunity to save.
- User reviews the plan before acting on it.
- User can rerun with a narrower profile.

Failure handling:
- Source failure: continue with remaining sources.
- LLM failure: use local template.
- DB failure: return unsaved results with warning.
- Invalid input: return a helpful 400 response.

Logging:
- JSON logs with event name, duration, source counts, and warning codes.
- No secrets or full raw profile text in logs.

## 11. Testing Plan

Manual tests:
- Submit a complete profile.
- Submit missing/short profile.
- Save an opportunity.
- Refresh saved list.
- Run without Gemini key.

Unit tests:
- Validate scoring function.
- Validate input parser.
- Validate action-plan fallback.

API tests:
- `POST /api/radar` success.
- `POST /api/radar` validation failure.
- `GET /api/health` returns non-secret status.

Deployment smoke tests:
- Home page loads.
- `/api/health` returns 200.
- One radar run completes.
- Vercel logs show structured events.

Failure-mode tests:
- Bad database URL.
- Missing Gemini key.
- LLM rate-limit response.
- Empty funding feed.

## 12. Demo Script

Minute 0-1:
- Show GitHub repo, CI workflow, Vercel deployment, Neon database, and env vars.
- Explain that everything uses free tiers and deploys to a free subdomain.

Minute 1-2:
- Open the public Vercel URL.
- Enter a profile: early-career climate-health researcher, Kenya, implementation science, budget under $250k, deadline in 120 days.
- Run the radar.

Minute 2-3:
- Show ranked opportunities, eligibility explanation, and one-page action plan.
- Open `/api/health`.
- Mention fallback paths: seed data, deterministic scoring, no browser-exposed API key, CI/CD auto-deploy.

## 13. README Template

```markdown
# Live Research Grant Radar

Live Research Grant Radar is a free-tier deployed web app that turns a research profile into ranked funding opportunities, eligibility notes, and a one-page application action plan.

## Architecture

- Next.js full-stack app
- Vercel Hobby hosting
- Neon Postgres
- Gemini Developer API
- GitHub Actions CI
- Server-side agent workflow

## Free Tools Used

- GitHub
- Vercel Hobby
- Neon Free
- Gemini Developer API free tier
- GitHub Actions

## Setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

## Environment Variables

See `.env.example`.

## Local Development

```powershell
npm run typecheck
npm run lint
npm run build
```

## Deployment

Import the GitHub repo into Vercel, select Next.js, add environment variables, and deploy.

## Demo Steps

1. Enter a research profile.
2. Run the radar.
3. Review ranked opportunities.
4. Open the generated action plan.
5. Check `/api/health`.

## Limitations

- Demo is unauthenticated.
- Source adapters are intentionally simple.
- LLM output must be reviewed by a human.

## Future Improvements

- Auth
- Scheduled grant refresh
- Email alerts
- More funding source adapters
- Export to PDF
```

## 14. Final Codex Execution Mode

After this plan, implement Task 1 only. Make minimal scaffold changes, run the listed checks where possible, explain what changed, and wait for confirmation before Task 2.

## 15. Required Account Setup Guide

| Account/service | Required? | Free plan | Credit card required? | Manual work | Codex can configure | Secret/API key | Paste location |
|---|---|---|---|---|---|---|---|
| GitHub | Required | Free | No | Create account/repo | Git remote, CI file | None initially | Not applicable |
| Vercel | Required | Hobby | No for Hobby signup in normal flow | Import repo, add env vars | Next.js config | Env vars copied from local | Vercel Project Settings > Environment Variables |
| Neon | Required from DB task onward | Free | No for Free plan | Create project/database | Schema and migrations | `DATABASE_URL` | `.env.local`, Vercel env vars |
| Google AI Studio / Gemini | Required from LLM task onward | Free tier | No for free API key; billing only for paid use | Create API key | Server integration | `GEMINI_API_KEY` | `.env.local`, Vercel env vars |
| GitHub Actions | Required for CI | Included with GitHub | No | Enable Actions if prompted | Workflow file | Optional deployment smoke-test URL | GitHub repo secrets only if needed |

### A. GitHub Account And Repository Setup

1. Go to https://github.com.
2. Create an account or sign in.
3. Create a new repository named `live-research-grant-radar`.
4. Choose Public for the easiest free CI setup.
5. Do not add a README if pushing this local project first.
6. Push code with:
```powershell
git remote add origin https://github.com/YOUR-USER/live-research-grant-radar.git
git branch -M main
git push -u origin main
```
7. Codex is already connected to this local workspace. If using a hosted Codex workflow later, connect it to the GitHub repo from the Codex UI.

### B. Hosting Account Setup

1. Go to https://vercel.com.
2. Sign in with GitHub.
3. Choose Hobby.
4. Click Add New Project.
5. Import `live-research-grant-radar`.
6. Framework preset: Next.js.
7. Build command: `npm run build`.
8. Output directory: leave blank/default.
9. Install command: `npm install`.
10. Add environment variables.
11. Click Deploy.
12. Find the public URL on the project dashboard, usually `https://live-research-grant-radar.vercel.app` or a generated variant.

### C. Database Account Setup

1. Go to https://neon.com.
2. Sign in with GitHub or email.
3. Create a project named `live-research-grant-radar`.
4. Select the Free plan.
5. Create the default database.
6. Copy the pooled connection string if offered; otherwise copy the normal Postgres connection string.
7. Paste it locally into `.env.local` as `DATABASE_URL`.
8. Paste it into Vercel environment variables as `DATABASE_URL`.
9. After Task 4, run `npm run db:generate`, then `npm run db:migrate`.

### D. Free LLM API Setup

1. Go to https://aistudio.google.com/app/apikey.
2. Sign in with Google.
3. Click Create API key.
4. Copy the key.
5. Paste it locally into `.env.local` as `GEMINI_API_KEY`.
6. Paste it into Vercel environment variables as `GEMINI_API_KEY`.
7. If Google offers key restrictions, restrict usage to Gemini API where possible.
8. Test after Task 5 by running a radar request locally.

### E. Secrets And Environment Variables

Final `.env.example`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/db?sslmode=require"
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-2.5-flash"
FUNDING_FEEDS=""
RADAR_DEMO_MODE="true"
APP_BASE_URL="http://localhost:3000"
CRON_SECRET=""
```

Secrets checklist:
- `DATABASE_URL`: paste into `.env.local` and Vercel.
- `GEMINI_API_KEY`: paste into `.env.local` and Vercel.
- `CRON_SECRET`: optional later; paste into `.env.local` and Vercel.
- Never commit `.env.local` or real keys to GitHub.

### F. Verification Checklist

- GitHub connected: repo shows latest commit.
- Hosting connected: Vercel project shows the GitHub repo and latest deployment.
- Database works: migration succeeds and saved opportunities appear after Task 4.
- LLM works: radar result includes Gemini-generated explanation after Task 5.
- Deployed app live: home page and `/api/health` return 200 on the Vercel URL.
