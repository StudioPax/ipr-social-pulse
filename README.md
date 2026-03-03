# MERIDIAN — Northwestern IPR Social Intelligence Platform

> AI-powered social media intelligence platform for Northwestern Institute for Policy Research

**Client:** Northwestern IPR
**Built by:** Studio Pax
**Status:** Phase 1 (MVP) — Active Development
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

## Database Schema (7 Tables)

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
├── run_type (text) — pillar_tag, sentiment, full
├── status (text)
├── model_version, prompt_version (text)
├── posts_queued, posts_analyzed, posts_skipped (int)
├── error_message (text)
├── started_at / completed_at / created_at

post_analyses
├── id (uuid, PK)
├── post_id → posts.id
├── analysis_run_id → analysis_runs.id
├── pillar_primary, pillar_secondary (text)
├── pillar_confidence (numeric)
├── pillar_rationale (text)
├── sentiment_label (text), sentiment_score, sentiment_confidence (numeric)
├── performance_tier (text) — T1–T4
├── policy_relevance (numeric)
├── audience_fit, content_type (text)
├── nu_alignment_tags (text[])
├── recommended_action (text)
├── research_title, research_url (text)
├── research_authors (text[]), research_confidence (numeric)
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
│   ├── dashboard/page.tsx      # KPI cards + 3 tabbed Recharts views
│   ├── collect/page.tsx        # Collection UI + log window + date presets
│   ├── analyze/page.tsx        # Posts data table with stats
│   ├── outreach/page.tsx       # Placeholder (Phase 2)
│   ├── settings/page.tsx       # Client profile + social accounts
│   └── api/
│       └── collect/route.ts    # POST: run collection, GET: run history
├── components/
│   ├── icons/
│   │   └── meridian-logo.tsx   # SVG logo (mark + full variants)
│   ├── layout/
│   │   ├── top-bar.tsx         # App header with logo
│   │   └── side-nav.tsx        # Sidebar navigation
│   ├── data/
│   │   └── posts-table.tsx     # TanStack Table for posts
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
│   ├── bluesky.ts              # Bluesky AT Protocol client
│   ├── charts.ts               # Recharts theme config
│   ├── supabase.ts             # Supabase client init
│   ├── tokens.ts               # Design token constants
│   └── utils.ts                # cn() utility
└── types/
    └── database.ts             # Supabase generated types
```

---

## Feature Status

### Phase 1 — MVP (Current)

| Feature | Status | Notes |
|---------|--------|-------|
| **App Shell** | Done | TopBar, SideNav, responsive layout |
| **Meridian Logo** | Done | SVG component, mark + full variants |
| **Design System** | Done | IPR tokens, Northwestern purple (#4E2A84), DM Sans |
| **Supabase Schema** | Done | 7 tables, RLS policies, typed client |
| **Settings Page** | Done | Client profile, 5 social accounts |
| **Collect Page** | Done | Platform selector, date presets, log window |
| **Bluesky Connector** | Done | Feed + search modes, post normalization |
| **Collection API** | Done | POST /api/collect, dedup on upsert |
| **Dashboard** | Done | KPI cards, 3 tabs (Leadership, NU Alignment, Opportunity) |
| **Analyze Page** | Done | Posts table with sort, filter, pagination |
| **PostsTable Component** | Done | Reusable TanStack Table, platform/pillar badges |
| **Vercel Deployment** | Done | Auto-deploy from `main` branch |

### Phase 2 — AI Analysis (Next)

| Feature | Status | Notes |
|---------|--------|-------|
| Claude AI Integration | Not started | Pillar tagging, sentiment, tiering via Claude API |
| Analysis Run UI | Not started | Trigger analysis from Analyze page, progress tracking |
| Pillar Auto-Tagging | Not started | Claude classifies posts into 5 pillars with confidence |
| Sentiment Analysis | Not started | Positive/negative/neutral + score |
| Performance Tiering | Not started | T1–T4 tier assignment based on engagement + relevance |
| NU Alignment Scoring | Not started | How well content aligns with IPR messaging |
| Dashboard — Live Data | Partial | Charts wired to DB; AI-derived fields still empty |

### Phase 3 — Multi-Platform + Outreach

| Feature | Status | Notes |
|---------|--------|-------|
| Twitter/X Connector | Not started | Requires API key (v2 API) |
| LinkedIn Connector | Not started | Requires OAuth app |
| Facebook Connector | Not started | Requires Graph API token |
| Instagram Connector | Not started | Requires Graph API token |
| Outreach Module | Not started | Amplifier tracking, influencer tiering, action flags |
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
| Collect button does nothing | RLS enabled with zero policies | Added SELECT/INSERT/UPDATE policies for anon on all 7 tables |
| Bluesky API 400 "invalid handle" | Seeded handle was `@ipr.northwestern.edu` | Updated to `ipratnu.bsky.social` |
| `posts_content_format_check` violation | Constraint only allowed `short/medium/long/thread` | Broadened to include `image, video, link, carousel, poll, article, repost` |
| ESLint unused variable | `count` destructured but unused in route.ts | Removed from destructuring |
| ESLint `actionTypes` warning | shadcn/ui generated code | Added eslint-disable comment |

---

## Next Steps (Recommended Order)

1. **Verify Bluesky E2E** — Confirm collection works end-to-end after all 3 fixes
2. **Claude API Integration** — Add `ANTHROPIC_API_KEY` env var, create `/api/analyze` endpoint
3. **Analysis Prompt Engineering** — Design prompt for pillar tagging + sentiment + tiering
4. **Analysis Run UI** — "Analyze" button on Analyze page, progress indicator
5. **Dashboard AI Views** — Wire pillar distribution, sentiment charts to real `post_analyses` data
6. **Twitter/X Connector** — Next platform (highest value for IPR)
7. **Outreach Module** — Build the amplifier/influencer tracking page
8. **Google Sheets Export** — One-click export for IPR leadership reports
