# Campaign Import Pipeline — Specification v1.0

Studio Pax x Northwestern IPR | March 2026

---

## 1. Overview

### 1.1 What Changed

The original Content Campaigns spec (v1.1) assumed all AI generation happens **inside Meridian** via API calls. This spec adds a **prompt-based pipeline** where:

1. **Meridian** generates a structured prompt (mechanical — no LLM call)
2. **User** copies the prompt into **Claude App** (which has campaign blueprints as project knowledge)
3. **Claude App** generates a JSON file with detailed deliverables
4. **User** imports the JSON back into **Meridian**
5. **Meridian** validates, previews, and commits the deliverables to the database

### 1.2 What Stays the Same

- **Documents tab** — unchanged. Research papers, notes, supporting docs.
- **Strategy Generation** — stays. Produces `campaign_analyses` record (key messages, audience narratives, FrameWorks guidance). This is now also used as **context input** to the prompt.
- **All existing tables** — `campaigns`, `campaign_documents`, `campaign_channels`, `campaign_analyses` remain. Schema additions below are additive.

### 1.3 Design Principles

- **Prompt generation is mechanical** — template string concatenation, no LLM call. Deterministic output for the same inputs.
- **JSON schema is database-ready** — Claude App output maps directly to `campaign_channels` rows. No transformation layer.
- **Import never merges** — re-importing creates a new campaign. No merge logic.
- **Three-layer validation** — Claude App schema knowledge → Meridian server-side validation → user preview before commit.
- **Type-agnostic architecture** — campaign types compose sets of deliverable types (Lego-style). Prototype with `new_research` only.

---

## 2. Taxonomy

### 2.1 Campaign Types

New field on `campaigns` table. Determines which blueprint and prompt template to use.

| Value | Label | Duration | Description |
|-------|-------|----------|-------------|
| `new_research` | New Research | 4, 6, or 8 weeks | Brand new research — multi-week rollout from pre-launch to measurement |
| `amplify` | Amplify | 3 weeks | Boost existing high-performing content |
| `policy_moment` | Policy Moment | 24–72 hours | Rapid reactive campaign tied to a policy event |
| `faculty_spotlight` | Faculty Spotlight | 3 weeks | Researcher profile series |
| `donor_cultivation` | Donor Cultivation | 4 weeks | Impact-focused donor engagement |

**Prototype scope:** `new_research` only. Others designed for but not implemented.

### 2.2 Campaign Stages (renamed from "phase")

Stages within any campaign. Replaces the old `phase` field values to avoid collision with "Launch" campaign type.

| Old Value | New Value | Label | Description |
|-----------|-----------|-------|-------------|
| `launch` | `pre_launch` | Pre-Launch | Teaser content, internal prep, embargo period |
| *(new)* | `rollout` | Rollout | Active publishing window |
| `growth` | `sustain` | Sustain | Follow-up content, conversation monitoring |
| `maintain` | `measure` | Measure | Performance review period |

### 2.3 Deliverable = One `campaign_channels` Row

Each row in `campaign_channels` is one publishable piece of content with:
- A channel (linkedin, bluesky, etc.)
- An audience segment (policymaker, faculty, etc.)
- A stage (pre_launch, rollout, sustain, measure)
- A week number (1–8)
- Draft content, hashtags, mentions, CTA
- A status (planned → drafted → approved → published → skipped)

---

## 3. Schema Changes

### 3.1 `campaigns` Table — New Columns

```sql
ALTER TABLE campaigns
  ADD COLUMN campaign_type TEXT NOT NULL DEFAULT 'new_research',
  ADD COLUMN duration_weeks INT,
  ADD COLUMN start_date DATE;

-- campaign_type: new_research | amplify | policy_moment | faculty_spotlight | donor_cultivation
-- duration_weeks: 4, 6, or 8 for new_research; NULL for types without fixed duration
-- start_date: When the campaign begins publishing (NULL = not yet scheduled)
```

### 3.2 `campaign_channels` Table — Modifications

```sql
-- Rename "phase" to "stage" and update values
ALTER TABLE campaign_channels RENAME COLUMN phase TO stage;
-- Update existing data: launch → pre_launch, growth → sustain, maintain → measure

-- Add week_number for calendar grouping
ALTER TABLE campaign_channels
  ADD COLUMN week_number INT;

-- week_number: 1-based week within the campaign. UI groups by this.
-- scheduled_date is computed from: campaign.start_date + week_number + day_of_week
```

### 3.3 No New Tables Required

The import pipeline uses existing tables:
- `campaigns` — campaign shell (created by user before import)
- `campaign_channels` — deliverables (populated by import)
- `campaign_documents` — research context (uploaded by user)
- `campaign_analyses` — strategy output (generated in-app, used as prompt context)

---

## 4. The CampaignImportSchema

This is the JSON contract between Claude App output and Meridian's import endpoint. It is the **single source of truth** — referenced in:
1. Claude App project knowledge (so Claude produces compliant JSON)
2. Meridian's import validation (so bad JSON is rejected with clear errors)
3. The generated prompt (so Claude knows what format to output)

### 4.1 Schema Definition

```typescript
interface CampaignImportSchema {
  // Metadata (for validation — must match the campaign being imported into)
  campaign_type: "new_research" | "amplify" | "policy_moment" | "faculty_spotlight" | "donor_cultivation";
  duration_weeks: number; // e.g., 4, 6, or 8
  channels_used: string[]; // e.g., ["linkedin", "bluesky", "twitter", "website", "newsletter"]

  // The deliverables
  deliverables: CampaignDeliverable[];
}

interface CampaignDeliverable {
  // Scheduling
  week_number: number;           // 1-based (1 = first week of campaign)
  day_of_week: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  publish_order: number;         // Sequence within that day (1 = first post of the day)

  // What and where
  channel: string;               // Must be one of CAMPAIGN_CHANNELS values
  audience_segment: string;      // Must be one of TARGET_AUDIENCES values
  stage: "pre_launch" | "rollout" | "sustain" | "measure";

  // Content
  suggested_content: string;     // Full draft copy for this channel
  narrative_angle: string;       // The framing/hook for this audience on this channel
  call_to_action: string;        // What the audience should do
  hashtags: string[];            // Suggested hashtags (with # prefix)
  mentions: string[];            // Suggested @mentions
  media_suggestion: string;      // What visual/media to pair

  // Optional
  key_message_ids?: number[];    // References to which key messages (by index) this uses
  char_limit?: number;           // Auto-set per channel, but can be overridden
}
```

### 4.2 Validation Rules

Applied server-side by Meridian's import endpoint:

| Field | Rule |
|-------|------|
| `campaign_type` | Must match the campaign record being imported into |
| `duration_weeks` | Must be 4, 6, or 8 for `new_research` |
| `week_number` | Must be 1 ≤ n ≤ `duration_weeks` |
| `day_of_week` | Must be valid day string |
| `channel` | Must be one of: `bluesky`, `twitter`, `linkedin`, `facebook`, `instagram`, `website`, `newsletter`, `press_release`, `op_ed`, `event`, `podcast` |
| `audience_segment` | Must be one of: `policymaker`, `faculty`, `donor`, `public`, `media`, `nu_leadership` |
| `stage` | Must be one of: `pre_launch`, `rollout`, `sustain`, `measure` |
| `suggested_content` | Required, non-empty string |
| `narrative_angle` | Required, non-empty string |
| `deliverables` | Must have at least 1 deliverable |

### 4.3 Example JSON (New Research, 4-Week, 3 Channels)

```json
{
  "campaign_type": "new_research",
  "duration_weeks": 4,
  "channels_used": ["linkedin", "bluesky", "newsletter"],
  "deliverables": [
    {
      "week_number": 1,
      "day_of_week": "monday",
      "publish_order": 1,
      "channel": "linkedin",
      "audience_segment": "policymaker",
      "stage": "pre_launch",
      "suggested_content": "New research from @NorthwesternIPR reveals how state-level tax credit policies reduced child poverty by 23% in participating states. Full findings drop Wednesday. #PolicyResearch #ChildPoverty",
      "narrative_angle": "Policy-first teaser emphasizing the evidence base",
      "call_to_action": "Follow for the full study release Wednesday",
      "hashtags": ["#PolicyResearch", "#ChildPoverty", "#TaxCredits"],
      "mentions": ["@NorthwesternIPR", "@ProfSmithNU"],
      "media_suggestion": "Data teaser graphic — map showing participating states"
    },
    {
      "week_number": 1,
      "day_of_week": "wednesday",
      "publish_order": 1,
      "channel": "linkedin",
      "audience_segment": "policymaker",
      "stage": "rollout",
      "suggested_content": "NEW STUDY: Our research team analyzed 10 years of state tax credit data...",
      "narrative_angle": "Full findings release — lead with the most compelling stat",
      "call_to_action": "Read the full study [link]",
      "hashtags": ["#PolicyResearch", "#ChildPoverty"],
      "mentions": ["@NorthwesternIPR"],
      "media_suggestion": "Key findings infographic — 3-panel carousel"
    }
  ]
}
```

---

## 5. Prompt Template Architecture

### 5.1 How It Works

```
┌─────────────────────────────────────────────┐
│ MERIDIAN (mechanical, no LLM)               │
│                                             │
│  Campaign metadata (type, weeks, channels)  │
│  + Research documents (text embedded)       │
│  + Strategy analysis (curated subset)       │
│  + Output schema (CampaignImportSchema)     │
│  + Channel specs (char limits, audiences)   │
│  + Campaign type blueprint reference        │
│                                             │
│  ══════════════════════════════════════════  │
│  Template concatenation → PROMPT STRING     │
└─────────────┬───────────────────────────────┘
              │ [Copy Button]
              ▼
┌─────────────────────────────────────────────┐
│ CLAUDE APP                                  │
│                                             │
│  Project Knowledge:                         │
│  • Campaign blueprints (creative guidance)  │
│  • IPR brand voice & FrameWorks method      │
│  • Channel best practices                   │
│  • Example outputs                          │
│                                             │
│  User pastes prompt → Claude generates JSON │
└─────────────┬───────────────────────────────┘
              │ [User copies JSON]
              ▼
┌─────────────────────────────────────────────┐
│ MERIDIAN IMPORT                             │
│                                             │
│  1. Validate JSON against schema            │
│  2. Preview deliverables table              │
│  3. User confirms → commit to DB            │
└─────────────────────────────────────────────┘
```

### 5.2 Prompt Template Structure

The prompt is assembled from sections. Each section is a template function.

```
=== MERIDIAN CAMPAIGN PROMPT ===
Version: prompt-import-v1.0
Generated: {timestamp}

== CAMPAIGN ==
Name: {title}
Type: {campaign_type}
Duration: {duration_weeks} weeks
Channels: {channels list, or "AUTO-MIX: recommend the best channel combination"}
Audiences: {target_audiences}
Start date: Relative (Week 1, Day 1)

== RESEARCH CONTEXT ==
--- Research Paper ---
Title: {paper.title}
Authors: {paper.authors}
{paper.content_text}

--- Research Notes (IPR Marketing) ---
{notes.content_text}

--- Supporting Documents ---
[{doc.title}]
{doc.content_text}

== STRATEGY ANCHOR ==
(Generated by Meridian's Strategy module — use as directional guidance)

Key Messages:
{strategy.key_messages as numbered list}

Audience Narratives:
{strategy.audience_narratives as structured block per audience}

FrameWorks Guidance:
- Values Lead: {strategy.fw_values_lead}
- Causal Chain: {strategy.fw_causal_chain}
- Cultural Freight (avoid): {strategy.fw_cultural_freight}
- Thematic Bridge: {strategy.fw_thematic_bridge}
- Solutions Framing: {strategy.fw_solutions_framing}

== OUTPUT INSTRUCTIONS ==
Generate a complete campaign calendar as a JSON object.

You MUST follow this exact schema:
{CampaignImportSchema as JSON Schema block}

Rules:
- week_number must be between 1 and {duration_weeks}
- Each deliverable is one publishable piece of content
- Distribute content across the full {duration_weeks}-week span
- Use the stage progression: pre_launch → rollout → sustain → measure
- Respect channel character limits: {channel specs}
- Content must follow FrameWorks methodology from the Strategy Anchor
- Suggested content must be COMPLETE DRAFT COPY, not placeholders
- Return ONLY the JSON object — no markdown, no explanation

== END PROMPT ==
```

### 5.3 What Goes Into the Strategy Anchor (Curated Subset)

From `campaign_analyses`, include:

| Field | Include | Why |
|-------|---------|-----|
| `key_messages` | ✅ | The "what to say" backbone |
| `audience_narratives` | ✅ | Audience-specific framing |
| `fw_values_lead` | ✅ | FrameWorks guardrail |
| `fw_causal_chain` | ✅ | FrameWorks guardrail |
| `fw_cultural_freight` | ✅ | FrameWorks guardrail |
| `fw_thematic_bridge` | ✅ | FrameWorks guardrail |
| `fw_solutions_framing` | ✅ | FrameWorks guardrail |
| `research_summary` | ❌ | Already in documents |
| `key_findings` | ❌ | Already in documents |
| `channel_strategy` | ❌ | Claude App generates its own — would conflict |
| `timing_recommendations` | ❌ | Claude App determines per-deliverable timing |
| `pillar_rationale` | ❌ | Not needed for content generation |

---

## 6. UX Flow

### 6.1 Campaign Creation (Create-then-Import)

```
Step 1: CREATE CAMPAIGN
┌──────────────────────────────────────┐
│ New Campaign                         │
│                                      │
│ Name: [________________________]     │
│ Type: [New Research      ▾]          │
│ Duration: [6 weeks  ▾]              │
│ Channels: ☑ LinkedIn  ☑ Bluesky     │
│           ☑ Twitter   ☑ Newsletter   │
│           ☐ Auto-mix                 │
│                                      │
│ Research: [Search papers...    🔍]   │
│   ✓ "Child Poverty & Tax Credits"    │
│   ✓ "State Policy Brief 2026"       │
│                                      │
│           [Create Campaign]          │
└──────────────────────────────────────┘

Step 2: ADD DOCUMENTS + RUN STRATEGY
(Existing flow — Documents tab, Strategy Generation)

Step 3: GENERATE PROMPT
┌──────────────────────────────────────┐
│ Campaign: Child Poverty Study        │
│ ┌────────────────────────────────┐   │
│ │ [Documents] [Strategy] [Prompt]│   │
│ └────────────────────────────────┘   │
│                                      │
│ ┌────────────────────────────────┐   │
│ │ === MERIDIAN CAMPAIGN PROMPT   │   │
│ │ Version: prompt-import-v1.0    │   │
│ │ ...                            │   │
│ │ (scrollable, read-only)        │   │
│ │                                │   │
│ └────────────────────────────────┘   │
│                                      │
│ [📋 Copy Prompt]  [📤 Import JSON]  │
│                                      │
│ ℹ️ Copy this prompt into Claude App  │
│   to generate your campaign calendar │
└──────────────────────────────────────┘

Step 4: IMPORT JSON
┌──────────────────────────────────────┐
│ Import Campaign Deliverables         │
│                                      │
│ ┌────────────────────────────────┐   │
│ │ Paste JSON or drop .json file  │   │
│ │                                │   │
│ │                                │   │
│ └────────────────────────────────┘   │
│                                      │
│ [Validate & Preview]                 │
│                                      │
│ ── Preview ──────────────────────    │
│ ✅ Valid JSON — 24 deliverables      │
│                                      │
│ Week 1 (Pre-Launch)                  │
│  Mon │ LinkedIn │ Policymaker │ ...  │
│  Wed │ Bluesky  │ Faculty     │ ...  │
│                                      │
│ Week 2 (Rollout)                     │
│  Mon │ LinkedIn │ Policymaker │ ...  │
│  Tue │ Twitter  │ Public      │ ...  │
│  ...                                 │
│                                      │
│ [Confirm Import — 24 deliverables]   │
└──────────────────────────────────────┘
```

### 6.2 Prompt Tab — Skip Option

If user already has a JSON file (from a previous Claude session, manual creation, etc.), they can go directly to **Import JSON** without generating a prompt. The Prompt tab shows both options:
- "Copy Prompt" — for first-time generation
- "Import JSON" — for direct upload (skip prompt step)

### 6.3 Post-Import

After import, the campaign detail page shows:
- **Documents tab** — unchanged
- **Strategy tab** — unchanged (the strategy anchor)
- **Calendar tab** — (replaces old "Channels" tab) grouped by week, showing all deliverables with inline editing
- **Prompt tab** — the generated prompt + import button

Deliverables are editable inline:
- Edit suggested_content, narrative_angle, CTA, hashtags
- Change status (planned → drafted → approved → published → skipped)
- Set actual scheduled_date (when user picks a campaign start_date)
- Link to published post (published_post_id) after publishing

### 6.4 Re-Import Flow

If user wants to regenerate:
1. Refine prompt in Claude App
2. Get new JSON
3. Import as **new campaign** (with suffix like "Child Poverty Study v2")
4. Compare side-by-side with original
5. Delete the old campaign if the new one is better

No merge logic. Clean separation.

---

## 7. API Endpoints

### 7.1 New Endpoints

```
POST /api/campaigns/[id]/generate-prompt
  → Returns the assembled prompt string
  → No LLM call — pure template concatenation
  → Inputs: campaign metadata + documents + strategy analysis
  → Output: { prompt: string, version: string }

POST /api/campaigns/[id]/import
  → Validates JSON against CampaignImportSchema
  → Returns preview data OR commits to database
  → Query param: ?preview=true (validate + return preview, don't save)
  → Query param: ?preview=false (validate + commit)
  → Input: { json: CampaignImportSchema }
  → Output (preview): { valid: true, summary: {...}, deliverables: [...] }
  → Output (commit): { success: true, deliverables_created: number }
  → Output (error): { valid: false, errors: [{field, message, deliverable_index}] }

DELETE /api/campaigns/[id]
  → Deletes campaign + all related records (cascade)
  → Requires confirmation token from frontend
```

### 7.2 Existing Endpoints (Unchanged)

All existing campaign CRUD and strategy generation endpoints remain as-is.

---

## 8. Claude App Setup (Reference)

### 8.1 What Goes Into Claude App Project Knowledge

These files should be added to the Claude App project:

1. **`campaign-import-schema.md`** — The CampaignImportSchema definition with all validation rules and examples
2. **`ipr-brand-voice.md`** — IPR tone, style guidelines, FrameWorks methodology deep-dive
3. **`channel-best-practices.md`** — Per-channel content strategies, optimal formats, timing guidance
4. **`new-research-blueprint.md`** — The "New Research" campaign blueprint:
   - Week-by-week structure (what happens in each stage)
   - Content cadence recommendations
   - Channel sequencing logic
   - Example complete campaign JSON
5. **`example-outputs/`** — 2-3 complete example JSON outputs for reference

### 8.2 What the Claude App Skill/Instructions Should Say

```
You are an IPR campaign content strategist. When given a MERIDIAN CAMPAIGN PROMPT,
generate a complete campaign calendar as JSON following the CampaignImportSchema
exactly.

Rules:
1. Output ONLY the JSON object — no markdown fences, no explanation
2. Every deliverable must have complete draft copy (not placeholders)
3. Follow FrameWorks methodology from the Strategy Anchor
4. Respect channel character limits
5. Distribute content across all weeks evenly
6. Use stage progression: pre_launch → rollout → sustain → measure
7. Each channel should have content for multiple audiences where appropriate
8. Validate your output against CampaignImportSchema before returning
```

---

## 9. Migration Notes

### 9.1 Database Migration

```sql
-- 1. Add new columns to campaigns
ALTER TABLE campaigns
  ADD COLUMN campaign_type TEXT NOT NULL DEFAULT 'new_research',
  ADD COLUMN duration_weeks INT,
  ADD COLUMN start_date DATE;

-- 2. Rename phase → stage on campaign_channels
ALTER TABLE campaign_channels RENAME COLUMN phase TO stage;

-- 3. Update existing stage values
UPDATE campaign_channels SET stage = 'pre_launch' WHERE stage = 'launch';
UPDATE campaign_channels SET stage = 'sustain' WHERE stage = 'growth';
UPDATE campaign_channels SET stage = 'measure' WHERE stage = 'maintain';

-- 4. Add week_number to campaign_channels
ALTER TABLE campaign_channels ADD COLUMN week_number INT;

-- 5. Add index for week-based queries
CREATE INDEX idx_campaign_channels_week ON campaign_channels(campaign_id, week_number);
```

### 9.2 Code Changes Summary

| File | Change |
|------|--------|
| `src/types/database.ts` | Regenerate from Supabase after migration |
| `src/lib/tokens.ts` | Update `CAMPAIGN_PHASES` → `CAMPAIGN_STAGES` with new values; add `CAMPAIGN_TYPES` |
| `src/lib/campaign-prompt.ts` | Add `buildImportPrompt()` function (the prompt template) |
| `src/app/api/campaigns/[id]/generate-prompt/route.ts` | New — assembles prompt from DB data |
| `src/app/api/campaigns/[id]/import/route.ts` | New — validates + previews + commits JSON |
| `src/app/campaigns/[id]/page.tsx` | Add Prompt tab + Import dialog + Calendar view |
| `src/components/data/campaign-create-dialog.tsx` | Add campaign_type, duration_weeks, channel selection |
| `src/components/data/campaign-calendar.tsx` | New — week-grouped deliverable view with inline editing |

---

## 10. Open for Future (Not in Prototype)

- [ ] Other campaign types (amplify, policy_moment, faculty_spotlight, donor_cultivation)
- [ ] Historical performance data in prompt (top-performing posts from Meridian)
- [ ] Document URLs instead of embedded text (Option C)
- [ ] Export campaign as JSON for round-trip editing
- [ ] Auto-mix channel recommendation (LLM-powered)
- [ ] Campaign start_date → auto-compute scheduled_dates from week_number
- [ ] Published post linking + campaign-level performance dashboard
