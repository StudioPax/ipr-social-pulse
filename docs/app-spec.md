# IPR Social Intelligence Platform — App Specification v1.0

Studio Pax x Northwestern IPR | Prepared for: Stephan Tran | March 2026

---

## Overview

- **App Name:** MERIDIAN (formerly IPR Social Pulse)
- **Purpose:** A modular, AI-powered social media intelligence platform that audits, exports, analyzes, and dashboards IPR's social media presence — mapped against IPR's policy pillars and Northwestern-wide strategic alignment.
- **Primary Client:** Northwestern IPR (default config)
- **Secondary Use:** Configurable for any client/org
- **Core Principle:** Analysis results are cached and never re-run unnecessarily. The engine is additive, not destructive.

---

## Architecture Recommendation (MVP — Single Path)

> My recommendation is this stack. Don't evaluate alternatives — build this.

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 14 (App Router) + shadcn/ui + Tailwind | Best Figma-to-code pipeline, Claude MCP-ready, Vercel-deployable in minutes |
| Backend / API | Next.js API Routes (Node.js) | Co-located with frontend, minimal ops overhead for MVP |
| Database | Supabase (PostgreSQL) | Free tier, real-time subscriptions, row-level security, REST + JS SDK |
| Analysis Engine | Claude API (claude-sonnet-4) | Existing skills, project knowledge via GitHub context injection |
| Social Data | Official APIs first (see Module 1) | Playwright fallback for platforms with no API access |
| Output | Google Sheets API v4 | Direct write — no Zapier intermediary needed |
| Knowledge Source | GitHub repo (via `@octokit/rest`) | Pull markdown skill files and inject into analysis prompts |
| Deployment | Vercel (frontend) + Supabase (data) | Zero-infra, free tier sufficient for MVP |
| Figma Integration | Figma MCP plugin + shadcn/ui Figma kit | Direct component handoff and design-to-code workflow |

**Total MVP cost at scale:** ~$0–$20/month (Supabase free + Vercel hobby + API pay-per-use)

---

## Module 1 — Social Media Auditor

### 1.1 Supported Platforms & API Strategy

| Platform | Access Method | Risk Level | Notes |
|----------|-------------|-----------|-------|
| LinkedIn | LinkedIn Marketing API (Company Pages) | Low | Requires app approval; free for organic posts |
| Twitter / X | Twitter API v2 (Basic tier — $100/mo) | Low | Free tier: 1 app/1 user, 500k read tweets/mo — sufficient for IPR volume |
| Facebook | Meta Graph API (Page token) | Low | Free, requires Page admin access |
| Instagram | Meta Graph API (Business/Creator) | Low | Same token as Facebook page |
| Bluesky | AT Protocol public API | Free | No auth needed for public posts |

**On ban risk:** All collection goes through official APIs with OAuth tokens stored in Supabase Vault (encrypted). Rate limits are respected with automatic backoff. **No browser automation or scraping is used unless a platform has no API** (currently none in the list above do). If a platform ever loses API access, Playwright is available as a fallback module — clearly flagged as "Cautious Mode" with human-like delays (2–8s random), session rotation, and a daily request cap.

### 1.2 Client Configuration

```
CLIENT PROFILE
├── client_id (UUID)
├── client_name (e.g., "Northwestern IPR")
├── created_at
├── social_accounts[]
│   ├── platform (linkedin | twitter | facebook | instagram | bluesky)
│   ├── account_id / handle
│   ├── oauth_token (encrypted, stored in Supabase Vault)
│   └── is_default (bool)
└── knowledge_repo_url (GitHub repo for Claude context injection)
```

**Default IPR accounts** are pre-seeded on first run. Additional clients can be added via the Client Manager UI. Each client is isolated — no cross-client data bleed.

### 1.3 Collection Parameters

| Parameter | Options | Default |
|-----------|---------|---------|
| Time Range (preset) | Last 1Y / 6M / 3M / 1M | Last 6M |
| Custom Date Range | Start date + End date | — |
| Platforms | Multi-select from configured accounts | All |
| Content Types | Posts, Reposts, Replies, Stories (where available) | Posts + Reposts |
| Minimum Engagement | Filter out posts below threshold | 0 (collect all) |

### 1.4 Post Data Schema (per post, stored in Supabase)

```sql
posts (
  id            UUID PRIMARY KEY,
  client_id     UUID REFERENCES clients,
  platform      TEXT,
  post_id       TEXT,          -- platform-native ID
  published_at  TIMESTAMPTZ,
  content_text  TEXT,
  content_url   TEXT,
  media_type    TEXT,          -- text | image | video | link | carousel
  media_urls    TEXT[],
  hashtags      TEXT[],
  mentions      TEXT[],
  links         TEXT[],

  -- Engagement metrics (at time of collection)
  likes         INT,
  comments      INT,
  shares        INT,
  reposts       INT,
  impressions   INT,
  reach         INT,
  clicks        INT,
  saves         INT,
  engagement_rate FLOAT,

  -- Derived / calculated
  engagement_total INT,
  content_format TEXT,         -- short | medium | long | thread

  -- IPR-specific tags (populated by analysis)
  pillar_tag    TEXT,          -- Health | Democracy | Methods | Opportunity | Sustainability
  research_ref  TEXT,          -- linked IPR research title if detected
  authors       TEXT[],        -- faculty authors if detected

  -- Collection metadata
  collected_at  TIMESTAMPTZ,
  collection_run_id UUID
)
```

---

## Module 2 — Structured Export

### 2.1 CSV Export Schema

Every collected post exports with the full schema above plus derived fields. Column order is standardized for LLM processing:

```
post_id | platform | published_at | content_text | media_type |
hashtags | mentions | links | likes | comments | shares | reposts |
impressions | reach | clicks | saves | engagement_rate | engagement_total |
content_format | pillar_tag | research_ref | authors | collected_at
```

### 2.2 Google Sheets Output (Recommended Path)

**Architecture:** Direct write via Google Sheets API v4 using a service account (not OAuth — eliminates browser dependency).

**Sheet structure per client:**

```
[ClientName]_SocialPulse
├── Tab: Raw Posts      ← full schema above, one row per post
├── Tab: By Platform    ← auto-summarized pivot
├── Tab: By Pillar      ← pillar performance breakdown
├── Tab: Analysis Log   ← which posts have been analyzed, when
└── Tab: Outreach Map   ← Module 4 data
```

**Update logic:**
- New posts → **append** rows, never overwrite
- Existing posts with new engagement data → **update** engagement columns only (preserve analysis columns)
- Analysis columns → written once, never overwritten unless user explicitly re-runs analysis on that post

**CSV fallback:** If Sheets API is unavailable, all data exports as a flat CSV with the same schema. One file per export run, timestamped.

---

## Module 3 — LLM Analysis Engine

### 3.1 MVP Recommendation (Single Path)

> Use Claude Sonnet 4 via API, inject GitHub skill files as system context, store results in Supabase, write output to Google Sheets. This is the only path I'm specifying.

**Why not other options:**
- OpenAI: Less alignment with your existing IPR skill files
- Local LLM: Too heavy for MVP, no project knowledge integration
- Zapier AI: Not flexible enough for pillar-tagged analysis

### 3.2 Analysis Data Model

```sql
post_analyses (
  id                UUID PRIMARY KEY,
  post_id           UUID REFERENCES posts,
  analysis_run_id   UUID,
  analyzed_at       TIMESTAMPTZ,

  -- Sentiment
  sentiment_score      FLOAT,       -- -1.0 to +1.0
  sentiment_label      TEXT,        -- positive | neutral | negative | mixed
  sentiment_confidence FLOAT,

  -- IPR Pillar Alignment
  pillar_primary       TEXT,
  pillar_secondary     TEXT,
  pillar_confidence    FLOAT,
  pillar_rationale     TEXT,

  -- Content Classification
  content_type         TEXT,        -- research_promo | achievement | policy | event | general
  audience_fit         TEXT,        -- policymaker | faculty | donor | public | mixed
  policy_relevance     FLOAT,      -- 0.0 to 1.0

  -- Research Linkage
  research_title       TEXT,
  research_authors     TEXT[],
  research_url         TEXT,
  research_confidence  FLOAT,

  -- Strategic Tags
  performance_tier     TEXT,        -- T1_PolicyEngine | T2_Visibility | T3_Niche | T4_Underperformer
  recommended_action   TEXT,        -- amplify | template | promote_niche | diagnose | archive

  -- NU Alignment
  nu_alignment_tags    TEXT[],      -- feinberg | trienens | ai_data | none

  -- Raw LLM output (for audit trail)
  llm_response_raw     JSONB,
  model_version        TEXT,
  prompt_version       TEXT
)
```

### 3.3 Pre-Analysis Staleness Check (Smart Skip Logic)

Before running analysis, the engine does a **lightweight pre-scan** (no API calls):

```
FOR EACH post in selected range:
  IF post_analyses record EXISTS
    IF analyzed_at > (now - 30 days) → SKIP (mark: "Current")
    IF analyzed_at > (now - 90 days) AND engagement_delta < 20% → SKIP (mark: "Stable")
    IF analyzed_at <= (now - 90 days) → FLAG (mark: "Stale — recommend refresh")
  ELSE → QUEUE for analysis
```

**User sees a pre-scan summary before committing:**

```
Pre-Scan Results:
  142 posts — Current (skip)
  23 posts — Stale (refresh recommended)
  37 posts — New (never analyzed)

  [Run New + Stale Only] [Run New Only] [Run Full Dataset ⚠ ~2.3k tokens]
```

Default action is **"Run New + Stale Only"** — preserves past analysis, adds minimally.

### 3.4 Claude Prompt Architecture

Each analysis call injects:

1. **System context:** IPR governance + strategy skill files (pulled from GitHub at runtime)
2. **Post batch:** Up to 10 posts per API call (batched for cost efficiency)
3. **Instruction:** Structured JSON output schema (pillar, sentiment, tier, action)

The GitHub repo URL is stored per client and fetched on analysis start — no static embedding. This means when skills are updated in GitHub, analysis automatically uses the latest version.

---

## Module 4 — Extended Outreach Analysis

### 4.1 What It Tracks

For each analyzed post, the outreach module extends to the **next ring** of engagement:

| Signal | Source | How It's Used |
|--------|--------|--------------|
| Who quoted/replied | Platform API | Identify amplifiers |
| Who reposted | Platform API | Measure organic reach |
| External site citations | Google Custom Search API | Policy sphere entry detection |
| Research paper citations | OpenAlex API (free) | Academic citation tracking |
| Author/org classification | LLM + OpenAlex | Label amplifiers as: journalist |

### 4.2 Outreach Schema

```sql
post_outreach (
  id                    UUID PRIMARY KEY,
  post_id               UUID REFERENCES posts,
  outreach_type         TEXT,        -- quote | reply | repost | citation | media_mention
  actor_handle          TEXT,
  actor_name            TEXT,
  actor_type            TEXT,        -- journalist | policymaker | academic | advocacy | peer_institute | public
  actor_follower_count  INT,
  actor_influence_score FLOAT,      -- calculated: follower_count * engagement_rate * type_weight
  content_snippet       TEXT,
  published_at          TIMESTAMPTZ,
  platform              TEXT,

  -- Research linkage (if citation)
  cited_research_title  TEXT,
  cited_authors         TEXT[],

  -- Actionability flag
  action_flag           TEXT         -- high_value_amplifier | policy_entry | media_opportunity | null
)
```

### 4.3 Actionability Layer (IPR Marketing Use)

The outreach analysis outputs an **Actionability Report** per post, designed for Patricia/Lex/Lily to act on — not just read.

### 4.4 Influencer Tiering (for IPR Marketing)

Amplifiers are scored and tiered automatically:

| Tier | Criteria | Recommended Action |
|------|---------|-------------------|
| Tier A — Strategic | Policymakers, major media, peer think tanks | Escalate to Andy/Francesca; relationship-build |
| Tier B — Network | Academic amplifiers, advocacy orgs, faculty peers | Engage directly; invite to IPR events |
| Tier C — Community | Engaged public, students, general media | Monitor; add to newsletter list if possible |
| Tier D — Noise | Bots, spam, irrelevant | Auto-filtered |

---

## Module 5 — Dashboard

### 5.1 Three Dashboard Views

The dashboard is a single URL, shareable by IPR team. Views are toggled by role context (no login required for read-only; token-protected for full access).

#### View 1 — Leadership Summary (for Francesca / Andy)

*Goal: Demonstrate activity and success in an executive-readable format*

- Total posts published (by period)
- Engagement trend (line chart, all platforms)
- Top 5 performing posts (with tier label)
- Pillar distribution (donut chart)
- Outreach highlights (top amplifiers, policy entries flagged)
- IPR Impact Score (composite index: engagement + reach + policy citations)

#### View 2 — University Alignment (for NU-wide presentation)

*Goal: Show IPR's contribution to NU strategic priorities*

- Content mapped to NU pillars (Feinberg, Trienens, AI/Data)
- Research → Policy translation examples (curated by LLM)
- Faculty amplification map (which faculty are most cited/amplified externally)
- Sentiment trend (how public discourse around IPR research themes is shifting)
- "IPR as policy amplifier" evidence panel — concrete examples of research entering policy sphere

#### View 3 — Opportunity Map (for IPR team)

*Goal: Identify where IPR can provide more support to research teams*

- Under-amplified research (high pillar relevance, low engagement) — flagged as "Hidden Gems"
- Researchers with no social presence or low amplification
- Pillar gaps (which pillars are underrepresented in social content)
- Recommended next actions (LLM-generated, 3 per session): "3 posts you should boost this week"

### 5.2 Dashboard Tech

- Built in Next.js with **Recharts** (line, bar, donut) and **D3** (network graph for outreach map)
- Styled with shadcn/ui components
- Shareable via URL param + read-only token (no login needed for recipients)
- PDF export via browser print (no server-side rendering needed for MVP)
- **Figma MCP** used to design dashboard layout → auto-converts to shadcn components

---

## Module 6 — UI Framework

### 6.1 Recommendation

**Use shadcn/ui + Next.js 14 + Tailwind CSS.**

| Criteria | shadcn/ui + Next.js |
|----------|-------------------|
| Figma integration | Official shadcn/ui Figma kit — 1:1 component mapping |
| Claude MCP | Claude in Chrome MCP + Claude Code work directly with Next.js files |
| LLM automation | Next.js API routes can call Claude API natively |
| Customization | Components are copy-pasted (not a dependency) — fully editable |
| Production-ready | Used by Vercel, Linear, Resend — not a toy |
| Deployment | Vercel one-click deploy, $0 for MVP |

**Figma workflow:**
1. Design components in Figma using shadcn/ui Figma kit
2. Use Figma MCP to export design specs directly into the codebase
3. Claude Code reads the exported specs and generates matching React components

### 6.2 IPR Design System (built into the app)

| Token | Value |
|-------|-------|
| Primary color | #4E2A84 (Northwestern purple) |
| Secondary | #B6ACD1 (lighter purple) |
| Accent | #FF6B35 (Studio Pax orange) |
| Neutral | #1A1A2E |
| Font: Display | Playfair Display (editorial authority) |
| Font: Body | DM Sans (clean, modern) |
| Border radius | 8px (professional, not playful) |

---

## Data Flow Diagram

```
[Social Platforms]
  | API (OAuth)
  v
[Collector Module]
  - Fetches posts by date range
  - Normalizes schema
  - Deduplicates
  |
  v
[Supabase: posts table]
  |
  ├──────────────────────────┐
  v                          v
[Pre-Scan Engine]     [Manual CSV Upload]
  - Checks analyzed_at       |
  - Flags stale / new        |
  |                          |
  v                          v
[Analysis Queue] ◄───────────┘
  |
  v
[Claude API]
  - System: GitHub skill files (ipr-governance, ipr-strategy)
  - Input: Post batches (10/call)
  - Output: Structured JSON (sentiment, pillar, tier, action)
  |
  v
[Supabase: post_analyses table]
  |
  ├──────────────────────────┐
  v                          v
[Outreach Module]     [Google Sheets Writer]
  - Fetch amplifiers         |
  - Score influencers        v
  - Flag actions       [Sheets: Raw + Analysis tabs]
  |
  v
[Supabase: post_outreach table]
  |
  v
[Dashboard Builder]
  - View 1: Leadership Summary
  - View 2: NU Alignment
  - View 3: Opportunity Map
  |
  v
[Shareable URL + PDF Export]
```

---

## Build Sequence (Recommended Phases)

### Phase 1 — Core Pipeline (Weeks 1–3)
- [ ] Supabase schema setup (posts, analyses, clients)
- [ ] LinkedIn + Twitter API connectors
- [ ] Post collection UI (date range, platform select)
- [ ] CSV export
- [ ] Google Sheets writer

### Phase 2 — Analysis Engine (Weeks 4–6)
- [ ] Pre-scan staleness check UI
- [ ] Claude API integration with GitHub skill injection
- [ ] Analysis queue + batch processing
- [ ] Results stored in Supabase
- [ ] Analysis columns written back to Sheets

### Phase 3 — Outreach + Dashboard (Weeks 7–10)
- [ ] Outreach collection (quote/repost APIs)
- [ ] Influencer tiering + actionability report
- [ ] Dashboard View 1 (Leadership)
- [ ] Dashboard View 2 (NU Alignment)
- [ ] Dashboard View 3 (Opportunity)

### Phase 4 — Polish + Client Config (Weeks 11–12)
- [ ] Multi-client support (Client Manager UI)
- [ ] Shareable dashboard URLs (read-only token)
- [ ] PDF export
- [ ] Figma design system finalization
- [ ] IPR onboarding flow (OAuth tokens, account setup)

---

## Open Questions for Next Session

1. **Twitter API tier:** Do you want to budget $100/mo for Twitter API v2 Basic, or start with LinkedIn + Facebook only?
2. **Google Sheets auth:** Should the app use IPR's Google Workspace service account, or a Studio Pax one for initial setup?
3. **GitHub repo:** Which repo should serve as the knowledge source for Claude skill injection? (The existing IPR project knowledge repo, or a new one?)
4. **Dashboard hosting:** Should the shareable dashboard live on a `ipr.northwestern.edu` subdomain, or is a Vercel URL (`ipr-socialpulse.vercel.app`) acceptable for MVP?
5. **Outreach scope:** Do you want outreach analysis to run automatically after every collection, or as a separate on-demand trigger?

---

*Studio Pax — IPR Social Pulse Spec v1.0 | March 2026*
*Next step: Validate Phase 1 scope → begin Supabase schema + API connector build*
