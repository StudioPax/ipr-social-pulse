# MERIDIAN — Claude Code Context

> This file is automatically read by Claude Code at the start of every session.
> It provides persistent project context so work can continue across conversations.

## What This Project Is

MERIDIAN is an AI-powered social media intelligence platform for Northwestern IPR (Institute for Policy Research). It collects posts from social platforms, analyzes them with Claude AI for pillar tagging / sentiment / tiering, and surfaces insights via dashboards.

**Client:** Northwestern IPR
**Built by:** Studio Pax (Stephan Tran)

## Key Reference Documents

Always read these before making architectural decisions or building new features:

- **`README.md`** — Project status, feature tracker, database schema, what's done vs what's next
- **`docs/app-spec.md`** — Full app specification: modules, data models, Claude prompt architecture, build phases
- **`docs/ui-spec.md`** — UI specification: design tokens, component specs, typography, color system, interaction states

## Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Database:** Supabase (PostgreSQL) — project ID: `iafotceipdmgcsmbkbdx`
- **UI:** shadcn/ui + Radix UI + Tailwind CSS v3
- **Charts:** Recharts
- **Tables:** TanStack Table v8
- **Fonts:** DM Sans (body), DM Serif Display (display), JetBrains Mono (data/code)
- **Deployment:** Vercel (auto-deploy from `main`)
- **Repo:** `StudioPax/ipr-social-pulse`

## Architecture Rules

1. **Use design tokens** — never raw hex values. All colors via CSS variables in `globals.css`
2. **shadcn/ui components** live in `src/components/ui/` — don't modify these directly
3. **Custom components** go in `src/components/data/` (tables, charts) or `src/components/layout/`
4. **API routes** in `src/app/api/` — Next.js API Routes, co-located with frontend
5. **Supabase client** via `src/lib/supabase.ts` — uses anon key with RLS policies
6. **TypeScript types** for DB in `src/types/database.ts` — generated from Supabase
7. **Numbers in tables/charts** always use `font-mono` with `tabular-nums`
8. **Component comments** — start each component file with `// @component Name — Description`

## Database

7 tables in Supabase, all with RLS enabled and anon-key policies:
- `clients` — multi-tenant client profiles
- `social_accounts` — platform connections per client
- `collection_runs` — collection job history
- `posts` — collected social media posts (UNIQUE on `client_id, platform, post_id`)
- `analysis_runs` — AI analysis job history
- `post_analyses` — Claude AI analysis results per post
- `post_outreach` — amplifier/influencer tracking per post

**Default client:** Northwestern IPR (`8734831a-16e0-4cbf-8335-7322855b07b1`)
**Bluesky handle:** `ipratnu.bsky.social`

## IPR Domain Knowledge

### Five Policy Pillars
- **Health** — Health policy, public health, healthcare systems
- **Democracy** — Democratic institutions, governance, civic engagement
- **Methods** — Research methods, data science, computational approaches
- **Opportunity** — Economic opportunity, inequality, social mobility
- **Sustainability** — Environmental policy, climate, energy

### Four Performance Tiers
- **T1_PolicyEngine** — High engagement + high policy relevance
- **T2_Visibility** — High engagement, moderate policy relevance
- **T3_Niche** — Low engagement, high policy relevance
- **T4_Underperformer** — Low engagement, low relevance

### Recommended Actions
- `amplify` | `template` | `promote_niche` | `diagnose` | `archive`

## Current Status

See `README.md` for the full feature status table. In summary:
- **Phase 1 (MVP) is largely complete:** app shell, Bluesky connector, collection UI with log window, dashboard with charts, analyze page with data table, settings page
- **Phase 2 (AI Analysis) is next:** Claude API integration for pillar tagging, sentiment, tiering
- **Phase 3 (Multi-Platform + Outreach)** is after that

## Code Conventions

- ESLint + Next.js config — run `npm run lint` before committing
- Tailwind for all styling — no CSS modules or styled-components
- Server components by default; `"use client"` only when needed (interactivity, hooks)
- All Supabase queries use the typed client from `src/lib/supabase.ts`
- Prefer `const` + arrow functions for component definitions
- Use `cn()` from `src/lib/utils.ts` for conditional class merging
