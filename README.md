# MERIDIAN — Northwestern IPR Social Intelligence Platform

> AI-powered social media intelligence platform for Northwestern Institute for Policy Research

**Client:** Northwestern IPR
**Built by:** Studio Pax
**Status:** Phase 2.5 (Dashboard Enhancements) — Complete | Phase 3 — Next
**Last updated:** 2026-03-03

---

## Overview

MERIDIAN collects, analyzes, and surfaces social media posts related to Northwestern IPR's five policy pillars. The platform uses AI (Claude) to tag content by pillar, assess sentiment, tier performance, and flag outreach opportunities — giving IPR leadership a real-time dashboard of their social media landscape.

### Policy Pillars

| Pillar | Description |
|--------|-------------|
| Health | Health policy, public health, healthcare systems |
| Democracy | Democratic institutions, governance, civic engagement |
| Methods | Research methods, data science, computational approaches |
| Opportunity | Economic opportunity, inequality, social mobility |
| Sustainability | Environmental policy, climate, energy |

### Performance Tiers

| Tier | Label | Description |
|------|-------|-------------|
| T1 | PolicyEngine | High engagement + high policy relevance |
| T2 | Visibility | High engagement, moderate policy relevance |
| T3 | Niche | Low engagement, high policy relevance |
| T4 | Underperformer | Low engagement, low relevance |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 14.2.35 |
| Language | TypeScript | 5.x |
| Database | Supabase (PostgreSQL) | — |
| UI Components | shadcn/ui + Radix | — |
| Styling | Tailwind CSS | 3.4.x |
| Charts | Recharts | 3.7.0 |
| Data Tables | TanStack Table | 8.21.x |
| Icons | Lucide React | 0.576.x |
| Hosting | Vercel | — |
| Fonts | DM Sans, DM Serif Display, JetBrains Mono | Google Fonts |

---

## Infrastructure

| Resource | Value |
|----------|-------|
| Supabase Project ID | `iafotceipdmgcsmbkbdx` |
| Supabase API URL | `https://iafotceipdmgcsmbkbdx.supabase.co` |
| GitHub Repo | `StudioPax/ipr-social-pulse` |
| Vercel Deployment | Linked to `main` branch |
| IPR Client ID | `8734831a-16e0-4cbf-8335-7322855b07b1` |
| Bluesky Handle | `ipratnu.bsky.social` |

### Environment Variables (Vercel + `.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://iafotceipdmgcsmbkbdx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<set in Vercel>
```

---

## Database Schema (8 Tables)

All tables have RLS enabled with anon-key policies for SELECT, INSERT, and UPDATE.

```
clients
├── id (uuid, PK)
├── client_name (text)
├── knowledge_repo_url (text, nullable)
├── created_at / updated_at (timestamptz)

social_accounts
├── id (uuid, PK)
├── client_id → clients.id
├── platform (text)  — bluesky, twitter, linkedin, facebook, instagram
├── account_id (text) — platform-specific ID
├── handle (text)
├── is_default (bool)
├── created_at / updated_at

client_settings
├── id (uuid, PK)
├── client_id → clients.id
├── setting_key (text)  — anthropic_api_key, gemini_api_key
├── setting_value (text)
├── created_at / updated_at
├── UNIQUE(client_id, setting_key)

collection_runs
├── id (uuid, PK)
├── client_id → clients.id
├── platforms (text[])
├── content_types (text[])
├── time_range_start / time_range_end (timestamptz)
├── min_engagement (int)
├── status (text) — pending, running, completed, failed
├── posts_collected (int)
├── error_message (text)
├── started_at / completed_at / created_at

posts
├── id (uuid, PK)
├── client_id → clients.id
├── collection_run_id → collection_runs.id
├── platform (text)
├── post_id (text) — native platform ID
├── content_text (text)
├── content_url (text)
├── content_format (text) — short, medium, long, thread, image, video, link, carousel, poll, article, repost
├── published_at (timestamptz)
├── likes, reposts, comments, shares, saves, clicks, impressions, reach (int)
├── engagement_total, engagement_rate (numeric)
├── hashtags, mentions, links, media_urls, authors (text[])
├── media_type, pillar_tag, research_ref (text)
├── collected_at (timestamptz)
├── UNIQUE(client_id, platform, post_id)

analysis_runs
├── id (uuid, PK)
├── client_id → clients.id
├── run_type (text) — new_only, new_and_stale, full
├── status (text) — pending, running, completed, failed
├── model_version, prompt_version (text)
├── posts_queued, posts_analyzed, posts_skipped (int)
├── error_message (text)
├── started_at / completed_at / created_at

post_analyses
├── id (uuid, PK)
├── post_id → posts.id (UNIQUE)
├── analysis_run_id → analysis_runs.id
├── pillar_primary, pillar_secondary (text)
├── pillar_confidence (numeric)
├── pillar_rationale (text)
├── sentiment_label (text), sentiment_score, sentiment_confidence (numeric)
├── sentiment_rationale (text)
├── performance_tier (text) — T1–T4
├── policy_relevance (numeric)
├── policy_relevance_rationale (text)
├── tier_rationale (text)
├── audience_fit, content_type (text)
├── nu_alignment_tags (text[])
├── recommended_action (text)
├── research_title, research_url (text)
├── research_authors (text[]), research_confidence (numeric)
├── key_topics (text[])
├── summary (text)
├── llm_response_raw (jsonb)
├── model_version, prompt_version (text)
├── analyzed_at (timestamptz)

post_outreach
├── id (uuid, PK)
├── post_id → posts.id
├── outreach_type (text)
├── platform (text)
├── actor_name, actor_handle, actor_type (text)
├── actor_follower_count (int), actor_influence_score (numeric)
├── content_snippet (text)
├── action_flag (text)
├── cited_research_title (text), cited_authors (text[])
├── published_at (timestamptz)
```

### Seed Data

- **1 client:** Northwestern IPR
- **5 social accounts:** Bluesky (connected), Twitter, LinkedIn, Facebook, Instagram (pending API keys)

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout: TopBar + SideNav + main
│   ├── page.tsx                # Home: logo + 4 feature cards
│   ├── globals.css             # Tailwind + IPR design tokens
│   ├── dashboard/page.tsx      # KPI cards + date range filter + 3 tabbed Recharts views
│   ├── collect/page.tsx        # Collection UI + log window + date presets
│   ├── analyze/page.tsx        # Posts table + stats + AI analysis panel
│   ├── outreach/page.tsx       # Placeholder (Phase 3)
│   ├── settings/page.tsx       # Client profile + social accounts + AI model keys
│   └── api/
│       ├── collect/route.ts    # POST: run collection, GET: run history
│       ├── analyze/route.ts    # POST: run AI analysis (SSE stream), GET: prescan/progress/history
│       └── settings/
│           └── keys/route.ts   # GET: key status, POST: save key, PUT: test connection
├── components/
│   ├── icons/
│   │   └── meridian-logo.tsx   # SVG logo (mark + full variants)
│   ├── layout/
│   │   ├── top-bar.tsx         # App header with logo
│   │   └── side-nav.tsx        # Sidebar navigation
│   ├── data/
│   │   ├── posts-table.tsx     # TanStack Table: sortable, filterable, expandable rows
│   │   ├── analysis-panel.tsx  # AI analysis UI: model selector, pre-scan, run buttons, log
│   │   └── date-range-filter.tsx # Date range filter: presets + custom range
│   └── ui/                     # shadcn/ui components (13)
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── table.tsx
│       ├── tabs.tsx
│       ├── toast.tsx
│       └── toaster.tsx
├── hooks/
│   └── use-toast.ts            # Toast notification hook
├── lib/
│   ├── analysis-prompt.ts      # LLM prompt template, JSON schema, version (v1.4)
│   ├── bluesky.ts              # Bluesky AT Protocol client
│   ├── charts.ts               # Recharts theme config
│   ├── claude.ts               # Claude API client (claude-sonnet-4)
│   ├── gemini.ts               # Gemini API client (gemini-3-pro-preview)
│   ├── supabase.ts             # Supabase client init
│   ├── tokens.ts               # Design token constants (pillars, tiers, actions, date presets)
│   └── utils.ts                # cn() utility
└── types/
    └── database.ts             # Supabase generated types (8 tables)
```

---

## Feature Status

### Phase 1 — MVP (Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| **App Shell** | Done | TopBar, SideNav, responsive layout |
| **Meridian Logo** | Done | SVG component, mark + full variants |
| **Design System** | Done | IPR tokens, Northwestern purple (#4E2A84), DM Sans |
| **Supabase Schema** | Done | 8 tables, RLS policies, typed client |
| **Settings Page** | Done | Client profile, social accounts, AI model API keys |
| **Collect Page** | Done | Platform selector, date presets, log window |
| **Bluesky Connector** | Done | Feed + search modes, post normalization |
| **Collection API** | Done | POST /api/collect, dedup on upsert |
| **Dashboard** | Done | KPI cards, 3 tabs (Leadership, NU Alignment, Opportunity) |
| **Vercel Deployment** | Done | Auto-deploy from `main` branch |

### Phase 2 — AI Analysis (Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| **Claude API Integration** | Done | `claude-sonnet-4` via `@anthropic-ai/sdk` |
| **Gemini API Integration** | Done | `gemini-3-pro-preview` via `@google/generative-ai` |
| **Analysis Prompt** | Done | v1.4 — pillar, sentiment, tier, topics, summary, rationales, policy relevance rationale, tier rationale |
| **Analysis API** | Done | SSE streaming with batched processing, prescan, progress, history |
| **Analysis Panel UI** | Done | Model selector, pre-scan counts, run buttons, real-time log, progress |
| **Pillar Auto-Tagging** | Done | Primary + secondary pillar with confidence + rationale |
| **Sentiment Analysis** | Done | Label + score + confidence + rationale (intent-based, not topic-based) |
| **Performance Tiering** | Done | T1–T4 based on engagement + policy relevance |
| **Recommended Actions** | Done | amplify, template, promote_niche, diagnose, archive |
| **Settings — API Keys** | Done | Masked input, save, test connection per model |
| **PostsTable — Analysis Columns** | Done | Sentiment, Tier, Action columns with sorting + tooltips |
| **PostsTable — Filter Bar** | Done | Collapsible chip filters: platform, pillar, sentiment, tier, action, content type, audience |
| **PostsTable — Expandable Rows** | Done | Full analysis detail: summary, rationales, scores, research, NU alignment, topics, hashtags |
| **Dashboard — Live Data** | Partial | Charts wired to DB; need to update charts to use post_analyses data |

### Phase 2.5 — Dashboard Enhancements (Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| **Dashboard Date Range Filter** | Done | Presets (last month/3mo/6mo/year) + custom range, server-side Supabase filtering |
| **Posts Over Time — Full Range Fill** | Done | Chart spans full date range with zero-fill for days without posts |
| **Posts Over Time — Snippet Tooltips** | Done | Hover shows date, post count, and truncated content snippets |
| **PostsTable — Hashtag Display** | Done | Hashtags shown as outlined monospace badges in expanded row detail |
| **PostsTable — Expand Arrow** | Done | SVG chevron with hover state + rotation animation (replaces unicode arrows) |

### Phase 3 — Multi-Platform + Outreach (Next)

| Feature | Status | Notes |
|---------|--------|-------|
| Twitter/X Connector | Not started | Requires API key (v2 API) |
| LinkedIn Connector | Not started | Requires OAuth app |
| Facebook Connector | Not started | Requires Graph API token |
| Instagram Connector | Not started | Requires Graph API token |
| Outreach Module | Not started | Amplifier tracking, influencer tiering, action flags |
| Dashboard AI Views | Not started | Update charts to source from post_analyses |
| Google Sheets Export | Not started | One-click export of dashboard data |
| Email Digest | Not started | Scheduled summary reports |

---

## Design System

### Colors (IPR Brand)

```css
--primary:       270 47% 34%    /* Northwestern Purple #4E2A84 */
--secondary:     210 20% 96%    /* Light surface */
--accent:        165 60% 42%    /* Teal accent */
--destructive:   0 72% 51%      /* Error red */
--muted:         220 14% 46%    /* Muted text */
```

### Typography

| Role | Font | Usage |
|------|------|-------|
| Body | DM Sans | All body text, labels, UI |
| Display | DM Serif Display | Headlines, hero text |
| Mono | JetBrains Mono | Code, log window, data |

---

## Development

### Prerequisites

- Node.js 18+
- npm / yarn / pnpm
- Supabase account (project already created)

### Local Setup

```bash
git clone https://github.com/StudioPax/ipr-social-pulse.git
cd ipr-social-pulse
npm install
cp .env.local.example .env.local  # Add your Supabase keys
npm run dev
```

### Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
npm start        # Start production server
```

---

## Known Issues & Fixes Applied

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Collect button does nothing | RLS enabled with zero policies | Added SELECT/INSERT/UPDATE policies for anon on all 8 tables |
| Bluesky API 400 "invalid handle" | Seeded handle was `@ipr.northwestern.edu` | Updated to `ipratnu.bsky.social` |
| `posts_content_format_check` violation | Constraint only allowed `short/medium/long/thread` | Broadened to include `image, video, link, carousel, poll, article, repost` |
| Sentiment misclassification | LLM classified by topic negativity, not communicative intent | Updated prompt v1.1 with explicit intent-based sentiment rules + examples |
| Set iteration build error | TypeScript `downlevelIteration` not enabled | Replaced `[...new Set()]` with `Array.from()` |
| ESLint unused variable | `count` destructured but unused in route.ts | Removed from destructuring |
| ESLint `actionTypes` warning | shadcn/ui generated code | Added eslint-disable comment |

---

## Next Steps (Recommended Order)

1. **Dashboard AI Views** — Update charts to source from `post_analyses` (pillar distribution, sentiment breakdown, tier mix)
2. **Twitter/X Connector** — Next platform (highest value for IPR), requires v2 API key
3. **Outreach Module** — Build the amplifier/influencer tracking page (Module 4 in app spec)
4. **LinkedIn / Facebook / Instagram Connectors** — OAuth-based platform integrations
5. **Google Sheets Export** — One-click export of dashboard data for IPR leadership
6. **Email Digest** — Scheduled summary reports
