# Module 7 — Content Campaigns Specification v1.1

Studio Pax x Northwestern IPR | Prepared for: Stephan Tran | March 2026

---

## 1. Overview

### 1.1 What This Module Does

Content Campaigns is the **proactive planning engine** of MERIDIAN. While Collect, Analyze, and Outreach work retrospectively on existing social posts, Content Campaigns works **prospectively** — starting from a research artifact and producing a multi-channel publishing strategy with audience-specific narratives.

A campaign is structured like a **project** — a document collection centered on a core piece of research, enriched by the marketing team's curated notes and supporting materials, with AI-powered strategy generation layered on top.

**Input:** A document collection: the research paper (core), research notes (IPR marketing's curated summary), and optional supporting materials (interview transcripts, data visualizations, press materials)
**Process:** Team-curated comprehension → AI-powered strategy generation → channel-specific content
**Output:** A single-page campaign brief with per-channel content plans, ready for the marketing team to execute

### 1.2 Design Principle: Separate Comprehension from Strategy

This is the most important architectural decision in this module.

**Comprehension** (understanding what the research says) is best done by humans — the marketing team reads the paper, talks to the researchers, and writes a research note that captures the key findings in accessible language. LLMs can struggle with dense academic papers: they may miss nuance in methodology sections, hallucinate statistical findings, or flatten complex arguments. The marketing team's research note is a curated, verified, human-authored artifact that represents *what IPR wants to communicate*.

**Strategy** (how to message the research across channels and audiences) is where AI excels — taking verified inputs and generating audience-specific narratives, channel-adapted content, FrameWorks-informed framing, and timing recommendations. The AI is fast, consistent, and can produce a dozen audience × channel variations in seconds.

MERIDIAN respects this division:

| Task | Who Does It | Why |
|------|------------|-----|
| Read the paper | Marketing team | Nuance, accuracy, editorial control |
| Write the research note | Marketing team | Voice, priorities, institutional knowledge |
| Optionally: generate a condensed brief | AI (optional) | Save time tokenizing long papers for context |
| Generate audience narratives | AI | Speed, consistency, multi-audience variation |
| Generate channel content drafts | AI | Platform-specific adaptation at scale |
| Apply FrameWorks methodology | AI | Systematic methodology application |
| Review and edit everything | Marketing team | Final editorial authority |

### 1.3 The Campaign as a Document Collection

Think of a campaign as a **Claude Project** — a container with a core document and supporting context. The AI reads *all* the documents when generating strategy, but the team controls what goes in.

```
Campaign: "Child Poverty & Tax Credits Study"
│
├── CORE DOCUMENT
│   └── Research Paper (PDF/text/URL)
│       The authoritative source. May be too long or dense
│       for the AI to process directly — that's OK.
│
├── AI BRIEF (optional, generated)
│   └── Condensed Research Brief
│       If the paper is long, the AI can produce a structured
│       summary. Team reviews and corrects before it's used
│       as context. Think of it as "tokenizing" the paper.
│
├── PRIMARY INPUT
│   └── Research Notes (IPR Marketing)
│       The team's curated summary — what they WANT to
│       communicate. This is the #1 input for strategy
│       generation. This is the source of truth for messaging.
│
├── SUPPORTING DOCUMENTS (optional, multiple)
│   ├── Interview transcript with PI
│   ├── Data visualization descriptions
│   ├── Press materials / fact sheets
│   └── Related prior research summaries
│
└── CAMPAIGN METADATA
    ├── Authors, DOI, publication date
    ├── Embargo date
    ├── Target audiences
    └── Selected channels
```

### 1.4 Two Paths Through the System

Teams can approach campaign creation in two ways:

**Path A: Team-Led (recommended)**
The team already has a research note and knows the research well.
1. Upload/paste research paper (for reference)
2. Paste research notes (the primary input)
3. Optionally add supporting documents
4. Skip AI Brief → go straight to Strategy Generation
5. AI generates channel content using the team's notes as primary context

**Path B: AI-Assisted**
The paper just dropped, the team needs help getting started.
1. Upload/paste research paper
2. Run "Generate AI Brief" — AI produces a condensed summary
3. Team reviews, corrects, and approves the brief
4. Team writes or refines their research notes (informed by the brief)
5. Run Strategy Generation using all documents as context

Both paths converge at Strategy Generation — the AI always uses the team's research notes (if provided) as the primary input.

### 1.5 Why It's a Separate Module

| Concern | Analyze (Module 3) | Outreach (Module 4) | Content Campaigns (Module 7) |
|---------|-------------------|--------------------|-----------------------------|
| Direction | Retrospective | Retrospective | **Prospective** |
| Input | Existing social posts | Existing post engagement | Document collection (research + notes) |
| AI task | Classify existing content | Track amplifiers | **Generate new content strategy** |
| Output | Analysis scores | Influencer tiers | **Campaign brief + channel plans** |
| User action | Review analysis | Monitor engagement | **Plan and execute publishing** |

### 1.6 The Research-to-Social Pipeline at IPR

```
1. Paper published in journal
2. IPR marketing writes research note (accessible summary)  ← ALREADY HAPPENING
3. Marketing plans how to message across channels            ← THIS IS THE GAP
4. Posts are published on social + website + newsletter
5. MERIDIAN Collect picks up the posts
6. Analyze classifies them
7. Outreach tracks amplification
8. Dashboard shows performance
```

### 1.7 Institutional Context — Northwestern

Research universities have specific content requirements that generic social tools don't address:

- **Embargo compliance** — journal embargoes, coordinated release timing
- **Multi-audience framing** — the same research needs fundamentally different angles for policymakers vs. donors vs. media vs. general public
- **Faculty engagement** — researchers themselves are a distribution channel; content must be easy for them to share
- **NU-wide alignment** — connecting individual research to institutional priorities (Feinberg, Trienens, AI/Data)
- **Policy calendar awareness** — timing content to legislative sessions, budget cycles, awareness months
- **FrameWorks methodology** — IPR's commitment to values-led, solutions-oriented communications
- **Research accuracy** — the marketing team, not an AI, must be the authority on what the research says

---

## 2. Data Model

### 2.1 New Tables (4)

```sql
-- ============================================================
-- campaigns — Project-level container for a research campaign
-- ============================================================
campaigns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID REFERENCES clients(id) NOT NULL,

  -- Campaign identity
  title               TEXT NOT NULL,           -- e.g., "Child Poverty & Tax Credits Study"
  status              TEXT NOT NULL DEFAULT 'draft',
                      -- draft | active | completed | archived

  -- Research metadata (lightweight — full content lives in campaign_documents)
  research_authors    TEXT[],                  -- Faculty authors
  research_doi        TEXT,                    -- DOI if available
  research_url        TEXT,                    -- Link to the published paper
  publication_date    DATE,                    -- Journal publication date
  embargo_until       TIMESTAMPTZ,             -- Embargo lift date (nullable)

  -- AI-determined (from strategy generation), user-editable
  pillar_primary      TEXT,                    -- Health | Democracy | Methods | Opportunity | Sustainability
  pillar_secondary    TEXT,
  nu_alignment_tags   TEXT[],                  -- feinberg | trienens | ai_data | none
  target_audiences    TEXT[] NOT NULL DEFAULT '{}',
                      -- policymaker | faculty | donor | public | media | nu_leadership

  -- Metadata
  created_by          TEXT,                    -- Team member who created the campaign
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),

  UNIQUE(client_id, title)
)

-- ============================================================
-- campaign_documents — Document collection for a campaign
-- The "project files" that provide context for AI strategy generation
-- ============================================================
campaign_documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,

  -- Document classification
  document_role       TEXT NOT NULL,
                      -- research_paper:    The core research document (PDF, text, or URL reference)
                      -- research_notes:    IPR marketing's curated summary (PRIMARY strategic input)
                      -- ai_brief:          AI-generated condensed summary of the paper (optional)
                      -- supporting:        Interview transcripts, fact sheets, data descriptions, etc.

  -- Content
  title               TEXT NOT NULL,           -- Display name (e.g., "Research Note — Child Poverty Study")
  content_text        TEXT,                    -- The document's text content (pasted or extracted)
  file_url            TEXT,                    -- URL to uploaded file (Supabase Storage) or external link
  file_name           TEXT,                    -- Original filename if uploaded
  file_type           TEXT,                    -- pdf | docx | txt | md | url

  -- Processing metadata
  source              TEXT NOT NULL DEFAULT 'uploaded',
                      -- uploaded:     Team uploaded or pasted the document
                      -- ai_generated: AI produced this (e.g., the AI Brief)
                      -- url_reference: Just a link, content not extracted
  word_count          INT,                     -- Approximate word count (for token estimation)
  is_included         BOOLEAN NOT NULL DEFAULT true,
                      -- Can be toggled off to exclude from AI context without deleting

  -- Ordering
  sort_order          INT NOT NULL DEFAULT 0,  -- Display order within the campaign

  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
)

-- ============================================================
-- campaign_channels — Per-channel content plan within a campaign
-- ============================================================
campaign_channels (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,

  -- Channel definition
  channel             TEXT NOT NULL,
                      -- bluesky | twitter | linkedin | facebook | instagram |
                      -- website | newsletter | press_release | op_ed | event | podcast
  audience_segment    TEXT NOT NULL,
                      -- policymaker | faculty | donor | public | media | nu_leadership

  -- AI-generated content (editable by marketing team)
  narrative_angle     TEXT,                    -- The framing/hook for this audience on this channel
  suggested_content   TEXT,                    -- Draft copy / talking points
  key_message_ids     INT[],                  -- References to which key messages (by index) this uses
  hashtags            TEXT[],                  -- Suggested hashtags
  mentions            TEXT[],                  -- Suggested @mentions (faculty, partner orgs)
  call_to_action      TEXT,                    -- What should the audience do?

  -- Scheduling
  scheduled_date      TIMESTAMPTZ,             -- Planned publish date
  publish_order       INT,                     -- Sequence within campaign (1 = first post)

  -- Status tracking
  status              TEXT NOT NULL DEFAULT 'planned',
                      -- planned | drafted | approved | published | skipped

  -- Bridge to existing MERIDIAN pipeline
  published_post_id   UUID REFERENCES posts(id),  -- Links to collected post after publishing

  -- Content specs
  char_limit          INT,                     -- Platform character limit (auto-set per channel)
  media_suggestion    TEXT,                    -- What visual/media to pair with this

  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
)

-- ============================================================
-- campaign_analyses — AI strategy output for the campaign
-- ============================================================
campaign_analyses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,

  -- Document context used (audit trail — which documents were included in this run)
  documents_used      JSONB NOT NULL DEFAULT '[]',
  -- Shape: [{"id": "uuid", "role": "research_notes", "title": "...", "word_count": 450}, ...]

  -- Research comprehension (from AI Brief, if generated — or from team's notes)
  research_summary    TEXT,                    -- Plain-language summary (AI Brief or team-authored)
  key_findings        TEXT[],                  -- 3-5 core findings
  policy_implications TEXT[],                  -- What this means for policy

  -- Strategic messaging (always AI-generated from strategy phase)
  key_messages        TEXT[],                  -- 3-5 key messages distilled for communications
  pillar_rationale    TEXT,                    -- Why this maps to these pillars
  newsworthiness      TEXT,                    -- What makes this timely/newsworthy now

  -- Audience narratives (one per target audience)
  audience_narratives JSONB NOT NULL DEFAULT '{}',
  -- Shape: {
  --   "policymaker": {
  --     "hook": "...",
  --     "framing": "...",
  --     "key_stat": "...",
  --     "call_to_action": "...",
  --     "tone": "authoritative, evidence-based"
  --   },
  --   "donor": { ... },
  --   "media": { ... },
  --   ...
  -- }

  -- Channel strategy
  channel_strategy    JSONB NOT NULL DEFAULT '{}',
  -- Shape: {
  --   "linkedin": {
  --     "rationale": "Professional audience, policy-adjacent",
  --     "best_audience": "policymaker",
  --     "format": "long-form post with data visual",
  --     "timing": "Tuesday 9am ET",
  --     "priority": "high"
  --   },
  --   "twitter": { ... },
  --   ...
  -- }

  -- FrameWorks Institute methodology (proactive, not evaluative)
  fw_values_lead          TEXT,                -- Recommended values-led opening
  fw_causal_chain         TEXT,                -- How to explain systemic causes
  fw_cultural_freight     TEXT,                -- Frames to avoid
  fw_thematic_bridge      TEXT,                -- How to bridge personal → structural
  fw_solutions_framing    TEXT,                -- How to give audience agency

  -- Timing & coordination
  timing_recommendations  TEXT,                -- Policy calendar awareness, news cycle alignment
  embargo_notes           TEXT,                -- Handling if there's an embargo
  faculty_engagement_plan TEXT,                -- How to involve the researcher(s)

  -- NU-wide alignment
  nu_alignment_mapping    TEXT,                -- How this ties to Feinberg/Trienens/AI priorities
  cross_promotion_opps    TEXT[],              -- Other NU units that might amplify

  -- Audit trail
  llm_response_raw    JSONB,
  model_version       TEXT,
  prompt_version      TEXT,
  analyzed_at         TIMESTAMPTZ DEFAULT now(),

  UNIQUE(campaign_id)                          -- One analysis per campaign (re-run overwrites)
)
```

### 2.2 Indexes

```sql
CREATE INDEX idx_campaigns_client ON campaigns(client_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_pillar ON campaigns(pillar_primary);
CREATE INDEX idx_campaign_documents_campaign ON campaign_documents(campaign_id);
CREATE INDEX idx_campaign_documents_role ON campaign_documents(document_role);
CREATE INDEX idx_campaign_channels_campaign ON campaign_channels(campaign_id);
CREATE INDEX idx_campaign_channels_status ON campaign_channels(status);
CREATE INDEX idx_campaign_channels_post ON campaign_channels(published_post_id);
```

### 2.3 RLS Policies

Follow existing pattern — anon-key policies for SELECT, INSERT, UPDATE on all four tables. Same as the other 8 tables.

### 2.4 Document Role Semantics

| Role | Provided By | Required? | Used For |
|------|------------|-----------|----------|
| `research_paper` | Team uploads/pastes | At least one doc required | Core reference; context for AI Brief generation |
| `research_notes` | Team writes/pastes | Recommended | **Primary input** for strategy generation — the team's curated messaging foundation |
| `ai_brief` | AI generates (optional) | No | Condensed version of the paper; useful when paper is too long for direct AI context |
| `supporting` | Team uploads (0+) | No | Interview transcripts, fact sheets, data descriptions — enriches AI context |

**Priority cascade for strategy generation:**
1. If `research_notes` exists and is included → use as primary context
2. If `ai_brief` exists and is included → use as secondary context
3. If only `research_paper` text exists → use directly (with warning about potential comprehension limitations)
4. All `supporting` documents that are included → appended as additional context

### 2.5 Bridge to Existing System

The critical field is `campaign_channels.published_post_id`. When a marketing team member publishes content based on a channel plan:

1. They mark the channel as `published` and (optionally) link the `published_post_id`
2. On next Collect run, MERIDIAN picks up the live post
3. Analyze classifies it — and the team can compare AI's classification vs. campaign intent
4. Outreach tracks its amplification
5. Dashboard can show campaign-level aggregated performance

This creates the **plan → publish → measure** feedback loop.

---

## 3. AI Prompt Architecture

### 3.1 Two Operations (Not Two Phases)

The previous spec assumed a sequential two-phase pipeline where Phase 1 (comprehension) always feeds Phase 2 (strategy). With the document-collection model, these become **two independent operations** that the team can run in any order — or skip the first entirely.

| Operation | Purpose | When To Use | Input | Output |
|-----------|---------|-------------|-------|--------|
| **Generate AI Brief** | Condense a long research paper into a structured summary | Paper is long/dense; team wants a starting point before writing their notes | Research paper text | Condensed brief (saved as `ai_brief` document) |
| **Generate Strategy** | Produce audience narratives, channel plans, FrameWorks guidance | Team is ready to plan the campaign | All included campaign documents | Campaign analysis record + channel plans |

**Generate AI Brief** is optional. **Generate Strategy** is the core AI operation.

### 3.2 Operation 1 — Generate AI Brief (Optional)

This is a comprehension aid, not a strategy step. The AI reads the paper and produces a structured summary that the team can review, correct, and use as a reference. It's saved as a document with `document_role = 'ai_brief'` in the campaign.

**When to use:** The paper is 20+ pages and the team wants help distilling it before writing their research notes. Or the team is unfamiliar with the research and wants an orientation.

**When to skip:** The team already has a research note. Or the paper is a short working paper / policy brief that's already accessible.

```
CAMPAIGN_BRIEF_PROMPT_VERSION = "v1.0"
```

**System prompt:**

```
You are a research analyst at Northwestern Institute for Policy Research (IPR).
Your task is to read an academic research paper and produce a STRUCTURED SUMMARY
designed to help a communications team understand the research.

This is NOT a communications piece — it's an internal briefing document. Be accurate,
comprehensive, and honest about limitations or caveats in the research.

Return ONLY valid JSON — no markdown, no code fences, no explanation.

## IPR Policy Pillars
- Health: Health policy, public health, healthcare systems, biomedical research
- Democracy: Democratic institutions, governance, civic engagement, voting
- Methods: Research methods, data science, computational approaches
- Opportunity: Economic opportunity, inequality, social mobility, education
- Sustainability: Environmental policy, climate change, energy, urban planning

## NU Strategic Alignment Areas
- feinberg: Feinberg School of Medicine connections
- trienens: Trienens Institute for Sustainability connections
- ai_data: AI and data science initiatives

## Your Tasks
1. Summarize the research question and why it matters (2-3 sentences)
2. Describe the methodology in plain language (1-2 sentences)
3. Extract 3-5 key findings — concrete, specific, and quotable
4. Note any important caveats, limitations, or nuances the communications
   team should be aware of (e.g., "findings apply to U.S. context only")
5. Identify policy implications
6. Map to IPR pillars with brief rationale
7. Identify potential NU alignment areas
8. Suggest 2-3 "headline angles" — possible framings a communications team
   might use (not final copy, just directions)

## Critical: Accuracy Over Creativity
- Do NOT embellish or overstate findings
- Do NOT invent data points that aren't in the paper
- If something is unclear from the text, say so: "The paper is ambiguous on..."
- If the paper is behind a paywall and you only have an abstract, say so
  and note which findings are from the abstract vs. inferred

## Output Schema
{
  "research_question": "What question does this paper address? (2-3 sentences)",
  "methodology": "How was the research conducted? (plain language, 1-2 sentences)",
  "key_findings": [
    {"finding": "...", "evidence": "Brief supporting data/context"},
    ...
  ],
  "caveats": ["Limitation or nuance 1", ...],
  "policy_implications": ["Implication 1", ...],
  "pillar_primary": "Health | Democracy | Methods | Opportunity | Sustainability",
  "pillar_secondary": "... or null",
  "pillar_rationale": "1-2 sentences",
  "nu_alignment_tags": ["feinberg", "trienens", "ai_data", or "none"],
  "headline_angles": [
    "Possible framing direction 1",
    "Possible framing direction 2",
    ...
  ],
  "confidence_note": "How confident the AI is in this summary — e.g., 'Based on full
    paper text' or 'Based on abstract only — findings may be incomplete'"
}
```

**User message:**

```
Produce a structured research brief from this paper.

--- Research Paper ---
Title: {title}
Authors: {authors}
DOI: {doi}
URL: {url}

{content_text from the research_paper document}

--- Additional Context ---
Publication date: {publication_date}
```

**After generation:** The result is saved as a new `campaign_documents` row with `document_role = 'ai_brief'`, `source = 'ai_generated'`. The team can:
- Read and review it in the campaign detail view
- Edit it directly (edits are saved)
- Toggle `is_included = false` to exclude it from strategy generation
- Delete it and regenerate if the first attempt was poor

### 3.3 Operation 2 — Generate Strategy (Core)

This is the primary AI operation. It takes **all included campaign documents** as context and produces audience narratives, channel plans, and FrameWorks guidance.

The prompt is designed so that the **Research Notes (if provided) are the authoritative messaging input**, with other documents providing supplementary context.

```
CAMPAIGN_STRATEGY_PROMPT_VERSION = "v1.0"
```

**System prompt:**

```
You are a strategic communications planner for Northwestern Institute for
Policy Research (IPR). You have been given a collection of documents about
a piece of IPR research. Your task is to generate a multi-channel
communications campaign strategy.

Return ONLY valid JSON — no markdown, no code fences, no explanation.

## Document Priority
You will receive multiple documents. Follow this priority order:
1. RESEARCH NOTES (authored by IPR marketing) — This is your PRIMARY source.
   The marketing team has already distilled the research into the messages
   they want to communicate. RESPECT their framing, emphasis, and priorities.
   Do not contradict or reinterpret what the team has written.
2. AI BRIEF (if present) — A condensed summary of the full paper. Use for
   additional context, data points, and nuance not covered in the notes.
3. SUPPORTING DOCUMENTS — Interview transcripts, fact sheets, etc. Mine
   these for quotable details, human stories, and specific data.
4. RESEARCH PAPER (if included) — The authoritative source. Refer to for
   accuracy but do not attempt to independently summarize it if Research
   Notes are provided.

## FrameWorks Institute Methodology (PROACTIVE — generate, don't evaluate)
Apply FrameWorks methodology to GENERATE well-framed content:

1. VALUES LEAD — Open with a broadly shared value, not statistics
2. CAUSAL CHAIN — Explain systemic causes, don't imply individual blame
3. CULTURAL FREIGHT — Avoid activating bootstrap/charity/deserving mindsets
4. EPISODIC → THEMATIC — Bridge personal stories to structural patterns
5. SOLUTIONS FRAMING — Give the audience agency, not passive sympathy

For each piece of content you generate, embed these principles.
Additionally, provide explicit FrameWorks guidance notes for the campaign.

## Audience Definitions
- policymaker: Government officials, legislators, legislative staff, think tank analysts.
  Tone: authoritative, evidence-based. They need: policy implications, data points, actionable recommendations.
- faculty: NU faculty, peer researchers, graduate students.
  Tone: collegial, intellectually rigorous. They need: methodology highlights, findings significance, collaboration opportunities.
- donor: Foundations, individual philanthropists, corporate partners.
  Tone: impact-oriented, inspiring. They need: real-world impact, return on investment, human stories.
- public: General citizens, students, community members.
  Tone: accessible, relatable. They need: why it matters to their lives, clear language, emotional connection.
- media: Journalists, editors, podcast producers.
  Tone: newsworthy, quotable. They need: the hook, the headline, expert availability, data visualizations.
- nu_leadership: Provost, deans, NU-wide communications.
  Tone: institutional pride, strategic alignment. They need: how this advances NU priorities, cross-school connections.

## Channel Specifications
- bluesky: 300 char limit. Academic/policy audience. Hashtag-friendly. Thread support.
- twitter: 280 char limit. Broad reach. Quote-tweet-optimized. Visual-forward.
- linkedin: 3000 char limit. Professional/policy audience. Long-form acceptable. Data-driven.
- facebook: 63,206 char limit. Community audience. Storytelling format. Video-friendly.
- instagram: 2200 char caption. Visual-first. Younger audience. Carousel for data.
- website: No limit. SEO-optimized article. Comprehensive. Permanent record.
- newsletter: 500-800 words. Donor/supporter base. Personal tone. Clear CTA.
- press_release: AP style. 500-700 words. Quote from PI. Available-for-interview line.
- op_ed: 750-800 words. Placed in policy publication. Argumentative. Solutions-oriented.

## Key Message Quality Standards
Each key message must:
- Lead with a value (FrameWorks methodology) — not a statistic
- Be quotable in a headline (< 20 words)
- Connect the finding to why it matters for people
- Avoid jargon — accessible to educated non-specialist
- RESPECT the framing from the Research Notes — amplify, don't reinterpret

## Output Schema
{
  "research_summary": "2-3 sentence accessible summary (drawn primarily from Research Notes)",
  "key_findings": ["finding 1 (from Research Notes/documents)", ...],
  "policy_implications": ["implication 1", ...],
  "pillar_primary": "Health | Democracy | Methods | Opportunity | Sustainability",
  "pillar_secondary": "... or null",
  "pillar_rationale": "1-2 sentences",
  "nu_alignment_tags": ["feinberg", "trienens", "ai_data", or "none"],
  "nu_alignment_mapping": "How this connects to NU priorities",
  "newsworthiness": "Why this matters now — policy calendar, current events, trends",
  "key_messages": [
    "Values-led message 1",
    "Values-led message 2",
    ...
  ],
  "audience_narratives": {
    "<audience>": {
      "hook": "Opening line that grabs this audience",
      "framing": "How to frame the research for this audience (2-3 sentences)",
      "key_stat": "The single most compelling data point for this audience",
      "call_to_action": "What this audience should do with this information",
      "tone": "Descriptor of voice/tone"
    }
  },
  "channel_strategy": {
    "<channel>": {
      "rationale": "Why this channel matters for this campaign",
      "best_audience": "Primary audience for this channel",
      "format": "Recommended content format",
      "timing": "Best day/time to publish",
      "priority": "high | medium | low",
      "suggested_content": "Full draft content for this channel",
      "hashtags": ["#tag1", "#tag2"],
      "mentions": ["@mention1"],
      "media_suggestion": "What visual/media to pair"
    }
  },
  "fw_values_lead": "Recommended values-led opening that works across channels",
  "fw_causal_chain": "How to explain the systemic dimension of this research",
  "fw_cultural_freight": "Specific frames/words to AVOID for this topic",
  "fw_thematic_bridge": "How to connect individual findings to structural patterns",
  "fw_solutions_framing": "How to give the audience agency and hope",
  "timing_recommendations": "Optimal launch timing considering policy calendar, news cycle",
  "embargo_notes": "How to handle embargo if present, or 'No embargo'",
  "faculty_engagement_plan": "How to involve the researcher(s) in amplification",
  "cross_promotion_opps": ["NU unit 1", "NU unit 2"]
}
```

**User message (assembled from campaign documents):**

```
Generate a campaign strategy for this IPR research.

=== CAMPAIGN ===
Title: {campaign.title}
Authors: {campaign.research_authors}
DOI: {campaign.research_doi}
Embargo: {campaign.embargo_until OR "None"}
Target audiences: {campaign.target_audiences[]}
Channels to plan: {selected_channels[]}

=== DOCUMENTS (in priority order) ===

--- RESEARCH NOTES (Primary — authored by IPR marketing) ---
{content_text from document where role = 'research_notes'}

--- AI BRIEF (if exists) ---
{content_text from document where role = 'ai_brief'}

--- SUPPORTING DOCUMENTS ---
[{title}]
{content_text}

[{title}]
{content_text}
...

--- RESEARCH PAPER (reference) ---
{content_text from document where role = 'research_paper',
 truncated to ~4000 words if longer, with note: "Truncated — see Research Notes for team's curated summary"}
```

**Context window management:**
- Research Notes: included in full (typically 500-2000 words)
- AI Brief: included in full (typically 500-1500 words)
- Supporting documents: included in full up to 3000 words each
- Research paper: truncated to ~4000 words if longer, with priority given to abstract, introduction, results, and conclusion sections
- Total context budget: ~15,000 words of source material per strategy call

### 3.4 Prompt Versioning

| Prompt | Version | File |
|--------|---------|------|
| AI Brief Generation | `brief-v1.0` | `src/lib/campaign-prompt.ts` |
| Strategy Generation | `strategy-v1.0` | `src/lib/campaign-prompt.ts` |

Stored on `campaign_analyses.prompt_version` as the strategy version (the Brief version is tracked on the `ai_brief` document's metadata).

---

## 4. API Routes

### 4.1 Route Structure

```
src/app/api/campaigns/
├── route.ts                    # GET: list campaigns, POST: create campaign
├── [id]/
│   ├── route.ts                # GET: campaign detail, PATCH: update, DELETE: archive
│   ├── documents/
│   │   ├── route.ts            # GET: list documents, POST: add document
│   │   └── [docId]/
│   │       └── route.ts        # GET: document, PATCH: update, DELETE: remove
│   ├── generate-brief/route.ts # POST: generate AI Brief (SSE stream)
│   ├── generate-strategy/route.ts  # POST: generate strategy (SSE stream)
│   └── channels/
│       ├── route.ts            # GET: list channels, POST: add channel plan
│       └── [channelId]/
│           └── route.ts        # PATCH: update channel, DELETE: remove channel
```

### 4.2 Campaign CRUD

**`GET /api/campaigns?client_id=...`**
Returns all campaigns for a client, ordered by `updated_at` DESC. Includes document count and role summary per campaign.

**`POST /api/campaigns`**
Creates a new campaign. Required: `client_id`, `title`. Optional: all other fields.

**`GET /api/campaigns/[id]`**
Returns full campaign with joined `campaign_documents`, `campaign_channels`, and `campaign_analyses`.

**`PATCH /api/campaigns/[id]`**
Updates campaign fields (title, status, metadata, pillar overrides, etc.).

**`DELETE /api/campaigns/[id]`**
Soft-delete: sets `status = 'archived'`.

### 4.3 Document Management

**`GET /api/campaigns/[id]/documents`**
Returns all documents for a campaign, ordered by `sort_order`.

**`POST /api/campaigns/[id]/documents`**

```typescript
interface AddDocumentRequest {
  document_role: 'research_paper' | 'research_notes' | 'supporting';
  title: string;
  content_text?: string;    // Pasted text
  file_url?: string;        // Uploaded file URL or external link
  file_name?: string;
  file_type?: string;
}
```

**`PATCH /api/campaigns/[id]/documents/[docId]`**
Update document content, title, toggle `is_included`, reorder.

**`DELETE /api/campaigns/[id]/documents/[docId]`**
Remove a document from the campaign.

### 4.4 Generate AI Brief (SSE Stream)

**`POST /api/campaigns/[id]/generate-brief`**

```typescript
interface GenerateBriefRequest {
  model: "claude" | "gemini";
}
```

Requires at least one `research_paper` document with `content_text`.

SSE events:

```
data: {"level":"info","message":"Reading research paper (2,340 words)..."}
data: {"level":"info","message":"Generating structured brief via Claude..."}
data: {"level":"success","message":"Brief generated — 5 key findings, 3 headline angles"}
data: {"level":"info","message":"Saved as campaign document (AI Brief)"}
data: {"level":"done","message":"Stream ended","status":"completed"}
```

After completion:
1. Creates a new `campaign_documents` row with `document_role = 'ai_brief'`, `source = 'ai_generated'`
2. If an `ai_brief` already exists, replaces it (one AI Brief per campaign)

### 4.5 Generate Strategy (SSE Stream)

**`POST /api/campaigns/[id]/generate-strategy`**

```typescript
interface GenerateStrategyRequest {
  model: "claude" | "gemini";
  target_audiences: string[];
  channels: string[];
}
```

Requires at least one included document. Warns if no `research_notes` document exists.

SSE events:

```
data: {"level":"info","message":"Assembling document context (3 documents, ~4,200 words)..."}
data: {"level":"info","message":"Primary input: Research Notes (1,200 words)"}
data: {"level":"info","message":"Supporting: AI Brief (800 words), Interview Transcript (2,200 words)"}
data: {"level":"info","message":"Generating strategy for 4 audiences × 6 channels..."}
data: {"level":"info","message":"Sending to Claude API..."}
data: {"level":"success","message":"Strategy generated — 4 audience narratives, 6 channel plans"}
data: {"level":"info","message":"Creating channel content plans..."}
data: {"level":"success","message":"Campaign strategy saved — 6 channel plans created"}
data: {"level":"done","message":"Stream ended","status":"completed","campaign_id":"..."}
```

After completion:
1. Upsert `campaign_analyses` record with `documents_used` tracking which docs were in context
2. Auto-generate `campaign_channels` rows for each channel × audience combination
3. Update `campaigns.pillar_primary/secondary` from strategy output
4. Update `campaigns.nu_alignment_tags` from strategy output

### 4.6 Channel Management

**`GET /api/campaigns/[id]/channels`**
Returns all channel plans for a campaign, ordered by `publish_order`.

**`POST /api/campaigns/[id]/channels`**
Manually add a channel plan.

**`PATCH /api/campaigns/[id]/channels/[channelId]`**
Update channel content, status, scheduled date, or link to published post.

---

## 5. UI Specification

### 5.1 Navigation

Add "Campaigns" to the sidebar between Outreach and Dashboard:

```
Collect
Analyze
Outreach
Campaigns    ← NEW
Dashboard
Settings
```

Icon: `LayoutTemplate` (Lucide).

### 5.2 Campaign List View (`/campaigns`)

```
┌─────────────────────────────────────────────────────────────┐
│  Content Campaigns                          [+ New Campaign] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Filter: [All ▾] [Health ▾] [Active ▾]       Search: [____] │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Child Poverty & Tax Credits Study                       │ │
│  │ Health · Opportunity │ Active │ 4/6 channels published  │ │
│  │ 3 docs │ Research Notes ✓ │ Authors: Smith, J. · Chen   │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Voter Participation in Midterm Elections                 │ │
│  │ Democracy │ Draft │ Not yet analyzed                     │ │
│  │ 1 doc │ Needs Research Notes │ Authors: Williams, R.     │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

Each card now shows document status (how many docs, whether Research Notes exist).

### 5.3 Campaign Creation

**"+ New Campaign"** opens a dialog with two sections:

**Step 1 — Research Identity**
- Title (required)
- Authors (multi-input, chips)
- Research paper URL (optional)
- DOI (optional)
- Publication date (date picker)
- Embargo date (date picker, optional)

**Step 2 — Initial Documents**
- Research paper — paste text area OR file upload (PDF/DOCX/TXT) OR "URL only (will add text later)"
- Research notes — paste text area (optional at creation, can add later)
- "You can add more documents after creating the campaign"

**Action buttons:**
- [Create Campaign] — saves and navigates to campaign detail
- No "Create & Analyze" here — the team should review their documents first

### 5.4 Campaign Detail View (`/campaigns/[id]`) — The Single-Page Brief

This is the primary view. It has two main sections: **Document Panel** (left/top) and **Strategy Brief** (right/bottom).

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back to Campaigns                                             │
│                                                                   │
│  Child Poverty & Tax Credits Study                                │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────────┐   │
│  │ ● Active │ │ Health   │ │Opportunity│ │ Feinberg · AI/Data│   │
│  └──────────┘ └──────────┘ └───────────┘ └──────────────────┘   │
│  Authors: Smith, J. · Chen, L.  │  Published: Feb 15, 2026       │
│                                                                   │
│  [Edit Details] [Export PDF]                                      │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─ CAMPAIGN DOCUMENTS ────────────────────────────────────────┐ │
│  │                                                              │ │
│  │  ┌─ Research Paper (core) ─────────────── ✓ Included ──┐   │ │
│  │  │ "Child Tax Credits and Poverty Reduction.pdf"         │   │ │
│  │  │ 12,400 words · PDF · Uploaded Mar 1                   │   │ │
│  │  │ [View] [Edit Text] [Toggle Off]                       │   │ │
│  │  └──────────────────────────────────────────────────────┘   │ │
│  │                                                              │ │
│  │  ┌─ Research Notes (primary input) ──────── ✓ Included ─┐  │ │
│  │  │ "Research Note — Child Poverty & Tax Credits"          │  │ │
│  │  │ 1,200 words · Pasted · Updated Mar 2                  │  │ │
│  │  │ [View] [Edit] [Toggle Off]                             │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                              │ │
│  │  ┌─ AI Brief (generated) ────────────────── ✓ Included ─┐  │ │
│  │  │ "AI-Generated Research Brief"                          │  │ │
│  │  │ 850 words · AI-generated Mar 1 · Claude                │  │ │
│  │  │ [View] [Edit] [Regenerate] [Toggle Off]                │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                              │ │
│  │  ┌─ Supporting ──────────────────────────── ✓ Included ─┐  │ │
│  │  │ "PI Interview Transcript — Prof. Smith"                │  │ │
│  │  │ 2,100 words · Pasted · Added Mar 2                     │  │ │
│  │  │ [View] [Edit] [Toggle Off] [Remove]                    │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                              │ │
│  │  [+ Add Document]  [Generate AI Brief]                       │ │
│  │                                                              │ │
│  │  ── Context Summary ──                                       │ │
│  │  4 documents included · ~16,550 words total                  │ │
│  │  Primary input: Research Notes (1,200 words)                 │ │
│  │                                                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─ STRATEGY ──────── [Generate Strategy ▶] [Re-generate] ────┐ │
│  │                                                              │ │
│  │  (If not yet generated, show a prompt:)                      │ │
│  │                                                              │ │
│  │  "Add your documents above, then generate a campaign         │ │
│  │   strategy. The AI will use your Research Notes as the       │ │
│  │   primary input for messaging."                              │ │
│  │                                                              │ │
│  │  Target audiences: [Policymaker ✓] [Donor ✓] [Media ✓] ... │ │
│  │  Channels: [LinkedIn ✓] [Twitter ✓] [Bluesky ✓] ...        │ │
│  │  Model: [Claude ▾]                                           │ │
│  │                                                              │ │
│  │  [Generate Strategy ▶]                                       │ │
│  │                                                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  (After strategy is generated, the following sections appear:)    │
│                                                                   │
│  ┌─ KEY MESSAGES ──────────────────────────────────────────────┐ │
│  │ 1. "Every child deserves..."  (values-led)                  │ │
│  │ 2. "New evidence shows systems..."  (causal chain)          │ │
│  │ 3. "Communities can act by..."  (solutions framing)         │ │
│  │ [Edit Messages]                                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─ FRAMEWORKS GUIDANCE ───────────────────────────────────────┐ │
│  │ Values Lead:    "Open with opportunity and fairness..."      │ │
│  │ Causal Chain:   "Emphasize systemic factors: tax structure.."│ │
│  │ Avoid:          "'Deserving poor', 'handout', 'welfare'..."  │ │
│  │ Bridge:         "From individual families → policy design..." │ │
│  │ Solutions:      "Give audience a role: 'contact your rep'..."│ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─ AUDIENCE NARRATIVES ───────────────────────────────────────┐ │
│  │ Tabs: [Policymaker] [Donor] [Media] [Public]                │ │
│  │                                                              │ │
│  │ Hook: "Tax credit expansion could lift 3M children..."       │ │
│  │ Framing: "Position as evidence for pending legislation..."   │ │
│  │ Key Stat: "42% reduction in childhood poverty..."            │ │
│  │ CTA: "Reference in committee testimony..."                   │ │
│  │ Tone: Authoritative, evidence-based                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─ CHANNEL PLAN ──────────────────────────────────────────────┐ │
│  │                                                              │ │
│  │  Channel   │ Audience  │ Status    │ Scheduled  │ Perf.     │ │
│  │ ──────────┼──────────┼──────────┼───────────┼────────── │ │
│  │  LinkedIn  │ Policy   │ ✓ Pub    │ Mar 5     │ 2.3k imp  │ │
│  │  Twitter   │ Media    │ Approved │ Mar 5     │ —         │ │
│  │  Bluesky   │ Academic │ Drafted  │ Mar 6     │ —         │ │
│  │  Website   │ Public   │ ✓ Pub    │ Mar 4     │ 890 views │ │
│  │  Newsletter│ Donor    │ Planned  │ Mar 10    │ —         │ │
│  │  Press Rel │ Media    │ Skipped  │ —         │ —         │ │
│  │                                                              │ │
│  │  [Expand row to see full draft content + edit]               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─ CAMPAIGN PERFORMANCE ──────────────────────────────────────┐ │
│  │ (Appears after channels are published and collected)         │ │
│  │ Posts published: 4/6  │  Total reach: 12.4k                  │ │
│  │ Avg engagement rate: 3.2%  │  Top channel: LinkedIn          │ │
│  │ Sentiment: 85% positive  │  Pillar match: ✓ (AI confirmed)  │ │
│  │ Top amplifier: @PolicyOrg (Tier A)                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 5.5 Document Viewer/Editor

When "View" or "Edit" is clicked on a document, it opens an inline expandable panel (same pattern as post expandable rows) or a side panel:

```
┌─────────────────────────────────────────────────────────────┐
│  Research Notes — Child Poverty & Tax Credits          [Close]│
│  Role: Primary Input │ 1,200 words │ Pasted │ Updated Mar 2  │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ New research from IPR faculty members Jane Smith and      ││
│  │ Li Chen examines the impact of expanded child tax         ││
│  │ credits on childhood poverty rates across 12 states...    ││
│  │                                                           ││
│  │ (full text, editable in edit mode)                        ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  [Save Changes] [Cancel]                                     │
└─────────────────────────────────────────────────────────────┘
```

### 5.6 Channel Expanded Row

(Unchanged from v1.0 — same expandable row pattern with draft content, char count, status, scheduling, and published post linking.)

### 5.7 Campaign Performance Section

(Unchanged from v1.0 — appears after channels are published and collected.)

---

## 6. Component Architecture

### 6.1 New Files

```
src/
├── app/
│   ├── campaigns/
│   │   ├── page.tsx                    # Campaign list view
│   │   └── [id]/
│   │       └── page.tsx                # Campaign detail / brief view
│   └── api/
│       └── campaigns/
│           ├── route.ts                # List + create campaigns
│           ├── [id]/
│           │   ├── route.ts            # Get, update, archive campaign
│           │   ├── documents/
│           │   │   ├── route.ts        # List + add documents
│           │   │   └── [docId]/
│           │   │       └── route.ts    # Get, update, delete document
│           │   ├── generate-brief/route.ts     # SSE: AI Brief generation
│           │   ├── generate-strategy/route.ts  # SSE: strategy generation
│           │   └── channels/
│           │       ├── route.ts        # List + add channels
│           │       └── [channelId]/
│           │           └── route.ts    # Update + remove channel
├── components/
│   └── data/
│       ├── campaign-list.tsx           # Campaign card grid
│       ├── campaign-brief.tsx          # Single-page campaign brief
│       ├── campaign-create-dialog.tsx  # Creation dialog
│       ├── campaign-documents.tsx      # Document collection panel
│       ├── campaign-document-viewer.tsx # Document view/edit panel
│       ├── campaign-channel-table.tsx  # Channel plan table with expandable rows
│       ├── campaign-strategy-panel.tsx # Strategy generation trigger (SSE log)
│       └── campaign-performance.tsx    # Aggregated performance from linked posts
├── lib/
│   └── campaign-prompt.ts              # AI Brief + Strategy prompt templates
```

### 6.2 Shared Components (Reused from Existing)

- `analysis-panel.tsx` pattern → `campaign-strategy-panel.tsx` (SSE streaming log)
- `posts-table.tsx` pattern → `campaign-channel-table.tsx` (expandable rows)
- `Badge`, `Card`, `Tabs`, `Dialog`, `Select` from `components/ui/`

---

## 7. Data Flow Diagram

```
                    ┌──────────────────────────────────────┐
                    │         DOCUMENT COLLECTION           │
                    │                                       │
                    │  Research Paper (core)                │
                    │  Research Notes (IPR marketing) ★     │
                    │  Supporting docs (transcripts, etc.)  │
                    │                                       │
                    └───────────────┬──────────────────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     ▼                             ▼
           ┌──────────────────┐          ┌──────────────────┐
           │ Generate AI Brief │          │ Team adds/edits   │
           │ (optional)        │          │ Research Notes     │
           │                   │          │ directly           │
           │ → Condensed       │          │                    │
           │   summary         │          │ ★ = Primary input  │
           │ → Key findings    │          │   for strategy     │
           │ → Headline angles │          │                    │
           └────────┬─────────┘          └────────┬───────────┘
                    │                              │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │    Generate Strategy (AI)     │
                    │                               │
                    │  Reads: Research Notes (★)    │
                    │  + AI Brief (if exists)       │
                    │  + Supporting docs            │
                    │  + Research paper (truncated)  │
                    │                               │
                    │  Produces:                    │
                    │  → Key messages               │
                    │  → Audience narratives        │
                    │  → Channel plans              │
                    │  → FrameWorks guidance        │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │ Campaign Brief               │ ← Single-page view
                    │ (team reviews, edits, approves│   Team has final say
                    │  all content)                 │   on everything
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────┴──────────────────────────┐
                    ▼        ▼        ▼         ▼            ▼
                 LinkedIn  Twitter  Bluesky  Website    Newsletter
                 (publish) (publish) (publish) (publish)  (send)
                    │        │        │         │            │
                    └────────┴────────┴─────────┴────────────┘
                                   │
                                   ▼  published_post_id bridge
                    ┌──────────────────────────────┐
                    │ Existing MERIDIAN Pipeline:   │
                    │ Collect → Analyze → Outreach  │
                    │ → Dashboard                   │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │ Campaign Performance          │ ← Feedback loop
                    └──────────────────────────────┘
```

---

## 8. Implementation Phases

### 8.1 Phase A — Foundation (1 sprint)
- [ ] Database: Create 4 tables (`campaigns`, `campaign_documents`, `campaign_channels`, `campaign_analyses`) + indexes + RLS policies
- [ ] API: Campaign CRUD (`/api/campaigns` + `/api/campaigns/[id]`)
- [ ] API: Document CRUD (`/api/campaigns/[id]/documents/...`)
- [ ] UI: Campaign list page + create dialog
- [ ] UI: Campaign detail page shell with document panel
- [ ] Nav: Add "Campaigns" to sidebar

### 8.2 Phase B — Document Collection + AI Brief (1 sprint)
- [ ] UI: Document panel — upload, paste, view, edit, toggle, reorder
- [ ] UI: Document viewer/editor component
- [ ] Prompt: AI Brief generation prompt (`campaign-prompt.ts`)
- [ ] API: `/api/campaigns/[id]/generate-brief` with SSE streaming
- [ ] UI: "Generate AI Brief" button + SSE log
- [ ] Context assembly logic: priority cascade, truncation, word counting

### 8.3 Phase C — Strategy Generation + Brief (1 sprint)
- [ ] Prompt: Strategy generation prompt (`campaign-prompt.ts`)
- [ ] API: `/api/campaigns/[id]/generate-strategy` with SSE streaming
- [ ] UI: Strategy generation panel (audience/channel selector, model picker, SSE log)
- [ ] UI: Key messages section
- [ ] UI: FrameWorks guidance section
- [ ] UI: Audience narratives tabs
- [ ] UI: Channel plan table with expandable rows
- [ ] Channel CRUD API
- [ ] Edit/approve/skip workflow for channel content

### 8.4 Phase D — Feedback Loop (1 sprint)
- [ ] Bridge: Link `published_post_id` to channel plans
- [ ] Performance section: Aggregate data from `post_analyses` + `post_outreach`
- [ ] Dashboard: Add campaign-level view/filter
- [ ] PDF export of campaign brief

---

## 9. Token Constants (additions to `src/lib/tokens.ts`)

```typescript
/** Campaign statuses */
export const CAMPAIGN_STATUSES = [
  "draft",
  "active",
  "completed",
  "archived",
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/** Campaign channel statuses */
export const CHANNEL_STATUSES = [
  "planned",
  "drafted",
  "approved",
  "published",
  "skipped",
] as const;

export type ChannelStatus = (typeof CHANNEL_STATUSES)[number];

/** Target audiences */
export const TARGET_AUDIENCES = [
  "policymaker",
  "faculty",
  "donor",
  "public",
  "media",
  "nu_leadership",
] as const;

export type TargetAudience = (typeof TARGET_AUDIENCES)[number];

/** Campaign channels */
export const CAMPAIGN_CHANNELS = [
  "bluesky",
  "twitter",
  "linkedin",
  "facebook",
  "instagram",
  "website",
  "newsletter",
  "press_release",
  "op_ed",
  "event",
  "podcast",
] as const;

export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number];

/** Campaign document roles */
export const DOCUMENT_ROLES = [
  "research_paper",
  "research_notes",
  "ai_brief",
  "supporting",
] as const;

export type DocumentRole = (typeof DOCUMENT_ROLES)[number];
```

---

## 10. Future Considerations

### 10.1 File Upload to Supabase Storage
MVP can use paste-only for document content. Future: upload PDFs/DOCX to Supabase Storage, with server-side text extraction (pdf-parse for PDFs, mammoth for DOCX).

### 10.2 Template Library
Successful campaigns become templates. A campaign marked `completed` with high performance scores could be saved as a reusable pattern — including its document structure and strategy prompts.

### 10.3 Campaign Comparison
Dashboard view comparing campaign performance: which pillars perform best, which audiences engage most, which channels deliver highest ROI.

### 10.4 Faculty Self-Service
A simplified version where faculty paste their abstract and get a ready-to-share social post — reducing the burden on the marketing team for lower-priority publications.

### 10.5 Automated Collection Tagging
When Collect picks up a post, auto-match it to an active campaign by content similarity (embeddings) or explicit hashtag/URL matching — reducing manual `published_post_id` linking.

### 10.6 Calendar Integration
Visual calendar view showing scheduled campaign channel publications across all active campaigns.

### 10.7 Multi-LLM Strategy
Allow different models for different operations (e.g., Claude for strategy generation, a specialized model for PDF comprehension if one emerges). The document-collection architecture makes this straightforward — each operation is independent.

### 10.8 Version History for Documents
Track edits to Research Notes and AI Briefs over time, so the team can see how their messaging evolved and which version was used for which strategy run.

---

*Studio Pax — Content Campaigns Module Spec v1.1 | March 2026*
*Companion to: App Spec v1.0 (Modules 1-6) | UI Spec v1.0*
