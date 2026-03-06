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

14 tables in Supabase, all with RLS enabled and anon-key policies:
- `clients` — multi-tenant client profiles
- `social_accounts` — platform connections per client
- `client_settings` — per-client settings (API keys, preferences). UNIQUE on `(client_id, setting_key)`
- `collection_runs` — collection job history
- `posts` — collected social media posts (UNIQUE on `client_id, platform, post_id`)
- `analysis_runs` — AI analysis job history
- `post_analyses` — AI analysis results per post (UNIQUE on `post_id`), includes FrameWorks Institute eval scores
- `post_outreach` — amplifier/influencer tracking per post
- `dashboard_insights` — cached AI-generated dashboard insights per client + date range
- `campaigns` — content campaign projects (UNIQUE title per client), includes campaign_type, duration, channels_used
- `campaign_documents` — research papers, notes, AI briefs, supporting docs per campaign (supports file uploads)
- `campaign_channels` — channel-specific content plans with stage/week/narrative tracking
- `campaign_analyses` — full AI strategy output per campaign (UNIQUE on `campaign_id`): FrameWorks evals, audience narratives (jsonb), channel strategy (jsonb)
- `prompt_templates` — DB-backed AI prompt templates per client. UNIQUE on `(client_id, slug, version)`

**Default client:** Northwestern IPR (`8734831a-16e0-4cbf-8335-7322855b07b1`)
**Bluesky handle:** `ipratnu.bsky.social`
**AI Models:** Claude (`claude-sonnet-4-20250514`), Gemini (`gemini-3-pro-preview`)
**Prompt slugs:** post-analysis, dashboard-insights, campaign-brief, campaign-strategy, audience-narrative

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
- **Phase 1 (MVP) — Complete:** app shell, Bluesky connector, collection UI with log window, dashboard with charts, analyze page with data table, settings page
- **Phase 2 (AI Analysis) — Complete:** Claude + Gemini API integration, pillar tagging, sentiment, tiering, analysis panel with SSE streaming log, filter bar, expandable rows
- **Phase 2.5 (Dashboard Enhancements) — Complete:** date range filter with presets + custom range, server-side Supabase date filtering, Posts Over Time + Engagement Trend charts with full-range fill + post snippet tooltips, hashtags in expanded row detail, improved expand arrows, dashboard decomposed into sub-components, AI insights panel with `dashboard_insights` caching table, collapsible panel
- **Phase 3A (Content Campaigns) — Complete:** 4 DB tables (campaigns, campaign_documents, campaign_channels, campaign_analyses), 10+ API routes (CRUD + AI generation + import), campaign list/detail pages with tabbed interface, AI Brief + Strategy + Audience Narrative generation with SSE streaming, FrameWorks Institute methodology, campaign-prompt.ts (brief-v1.0, strategy-v1.0), content import page
- **Phase 3A.1 (Prompt Management) — Complete:** `prompt_templates` table (14th table), `prompt-loader.ts` (DB → fallback), prompt editor UI in Settings (owner-mode gated), all 7 consumer files wired to `loadPrompt()`, 5 prompt slugs seeded, version restore capability
- **Phase 3B (Multi-Platform + Outreach)** is next

### Terminology: "Save project status" / "Save status"
When the user says "save project status" or "save status," update both `CLAUDE.md` (this file) and `README.md` to reflect the current state of the project — completed features, pending work, file structure changes, new DB fields, etc.

## Code Conventions

- ESLint + Next.js config — run `npm run lint` before committing
- Tailwind for all styling — no CSS modules or styled-components
- Server components by default; `"use client"` only when needed (interactivity, hooks)
- All Supabase queries use the typed client from `src/lib/supabase.ts`
- Prefer `const` + arrow functions for component definitions
- Use `cn()` from `src/lib/utils.ts` for conditional class merging
