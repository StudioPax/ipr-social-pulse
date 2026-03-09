/**
 * @module campaign-prompt — AI Brief + Strategy + Import prompt templates for Content Campaigns
 * Module 7 — Content Campaigns Specification v1.1 + Campaign Import Pipeline v1.0
 */

import { CAMPAIGN_CHANNELS, TARGET_AUDIENCES } from "./tokens";

export const CAMPAIGN_BRIEF_PROMPT_VERSION = "brief-v1.0";
export const CAMPAIGN_STRATEGY_PROMPT_VERSION = "strategy-v1.0";
export const CAMPAIGN_IMPORT_PROMPT_VERSION = "prompt-import-v1.0";
export const DELIVERABLE_CONTENT_PROMPT_VERSION = "deliverable-v1.0";

// ── Generate AI Brief (Optional) ──────────────────────────────────────────

export const BRIEF_SYSTEM_PROMPT = `You are a research analyst at Northwestern Institute for Policy Research (IPR).
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
  "confidence_note": "How confident the AI is in this summary — e.g., 'Based on full paper text' or 'Based on abstract only — findings may be incomplete'"
}`;

export function buildBriefUserMessage(paper: {
  title: string;
  authors: string[];
  doi?: string;
  url?: string;
  content_text: string;
  publication_date?: string;
}): string {
  return `Produce a structured research brief from this paper.

--- Research Paper ---
Title: ${paper.title}
Authors: ${paper.authors.join(", ")}
DOI: ${paper.doi || "N/A"}
URL: ${paper.url || "N/A"}

${paper.content_text}

--- Additional Context ---
Publication date: ${paper.publication_date || "Not specified"}`;
}

// ── Brief output schema (for JSON parsing) ─────────────────────────────

export interface BriefOutput {
  research_question: string;
  methodology: string;
  key_findings: { finding: string; evidence: string }[];
  caveats: string[];
  policy_implications: string[];
  pillar_primary: string;
  pillar_secondary: string | null;
  pillar_rationale: string;
  nu_alignment_tags: string[];
  headline_angles: string[];
  confidence_note: string;
}

// ── Generate Strategy (Core) ──────────────────────────────────────────────

export const STRATEGY_SYSTEM_PROMPT = `You are a strategic communications planner for Northwestern Institute for
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

## Weekly Objectives (REQUIRED)
You MUST generate a "weekly_objectives" array with exactly one entry per week of the
campaign duration. These objectives are the strategic backbone of the campaign plan —
they tell the content team WHY each week exists and WHAT it should accomplish.

Each objective is a 2–4 sentence paragraph that answers three questions:
1. What is the strategic goal for this week? (not just the stage label)
2. How does this week build on the previous week and set up the next?
3. What specific narrative angle, audience emphasis, or content tactic defines this week?

Write objectives as strategic director-level guidance, not summaries of deliverables.
The objectives should read as if a senior communications strategist is briefing the
content team before they write anything. Be specific to THIS campaign's research,
audiences, and framing — never generic.

Guidelines:
- Reference the actual research findings, not just "the research"
- Name specific audiences being prioritized that week and why
- Describe the narrative arc shift from week to week (e.g. "shift from data credibility to human impact")
- Reference FrameWorks framing choices relevant to each phase
- For pre_launch: what groundwork is being laid and for whom?
- For rollout: what's the lead message and which channels carry the weight?
- For sustain: how does the message evolve to stay fresh without losing coherence?
- For measure: what does the wrap-up accomplish and what doors does it leave open?

Example (for a 4-week campaign about youth mental health research):
- Week 1: "Seed the research with media and institutional audiences before the public launch. Establish the credibility of the methodology and prime journalists with the key finding — that the mental health effects persist far longer than previously documented. The narrative this week is evidence-first: position the study as filling a documented gap in the trauma literature."
- Week 2: "Full public launch. Lead with the values frame — every child deserves to feel safe — and let the data reinforce it. LinkedIn and Twitter carry the primary load for reach; the newsletter targets policymakers with structured implications. Shift the narrative from 'what the research found' to 'why it matters for communities right now.'"
- Week 3: "Deepen engagement through opinion and long-form content. The op-ed and public-facing website article move from headline statistics to human-scale storytelling, bridging episodic to thematic framing per FrameWorks methodology. Faculty are positioned for media interviews. Policymaker-specific content emphasizes structural funding gaps."
- Week 4: "Close the arc with measurement and forward-looking institutional messaging. Recap key evidence, signal ongoing researcher availability, and offer concrete policy support (briefings, testimony). The tone shifts from urgency to sustained commitment — IPR as a long-term resource, not a one-time news source."

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
  "weekly_objectives": [
    {
      "week_number": 1,
      "objective": "Strategic 2-4 sentence objective for this week. Reference the specific research, name the priority audiences, describe the narrative angle, and explain how this week sets up the next. Write as director-level guidance for the content team."
    },
    {
      "week_number": 2,
      "objective": "..."
    }
  ],
  "fw_values_lead": "Recommended values-led opening that works across channels",
  "fw_causal_chain": "How to explain the systemic dimension of this research",
  "fw_cultural_freight": "Specific frames/words to AVOID for this topic",
  "fw_thematic_bridge": "How to connect individual findings to structural patterns",
  "fw_solutions_framing": "How to give the audience agency and hope",
  "timing_recommendations": "Optimal launch timing considering policy calendar, news cycle",
  "embargo_notes": "How to handle embargo if present, or 'No embargo'",
  "faculty_engagement_plan": "How to involve the researcher(s) in amplification",
  "cross_promotion_opps": ["NU unit 1", "NU unit 2"]
}`;

export interface StrategyDocument {
  id: string;
  role: string;
  title: string;
  content_text: string;
  word_count: number;
}

export function buildStrategyUserMessage(campaign: {
  title: string;
  duration_weeks?: number;
  research_authors: string[];
  research_doi?: string;
  embargo_until?: string;
  target_audiences: string[];
  channels: string[];
  documents: StrategyDocument[];
}): string {
  const docSections: string[] = [];

  // Priority order: research_notes → ai_brief → supporting → research_paper
  const notes = campaign.documents.filter((d) => d.role === "research_notes");
  const briefs = campaign.documents.filter((d) => d.role === "ai_brief");
  const supporting = campaign.documents.filter((d) => d.role === "supporting");
  const papers = campaign.documents.filter((d) => d.role === "research_paper");

  if (notes.length > 0) {
    docSections.push(`--- RESEARCH NOTES (Primary — authored by IPR marketing) ---`);
    for (const doc of notes) {
      docSections.push(doc.content_text);
    }
  }

  if (briefs.length > 0) {
    docSections.push(`\n--- AI BRIEF ---`);
    for (const doc of briefs) {
      docSections.push(doc.content_text);
    }
  }

  if (supporting.length > 0) {
    docSections.push(`\n--- SUPPORTING DOCUMENTS ---`);
    for (const doc of supporting) {
      docSections.push(`[${doc.title}]`);
      docSections.push(doc.content_text);
    }
  }

  if (papers.length > 0) {
    docSections.push(`\n--- RESEARCH PAPER (reference) ---`);
    for (const doc of papers) {
      // Truncate to ~4000 words if longer
      const words = doc.content_text.split(/\s+/);
      if (words.length > 4000) {
        docSections.push(
          words.slice(0, 4000).join(" ") +
            "\n\n[Truncated — see Research Notes for team's curated summary]"
        );
      } else {
        docSections.push(doc.content_text);
      }
    }
  }

  return `Generate a campaign strategy for this IPR research.

=== CAMPAIGN ===
Title: ${campaign.title}
Duration: ${campaign.duration_weeks ? `${campaign.duration_weeks} weeks — you MUST generate exactly ${campaign.duration_weeks} weekly_objectives entries (week 1 through ${campaign.duration_weeks})` : "Not specified"}
Authors: ${campaign.research_authors.join(", ")}
DOI: ${campaign.research_doi || "N/A"}
Embargo: ${campaign.embargo_until || "None"}
Target audiences: ${campaign.target_audiences.join(", ")}
Channels to plan: ${campaign.channels.join(", ")}

=== DOCUMENTS (in priority order) ===

${docSections.join("\n")}`;
}

// ── Strategy output schema (for JSON parsing) ──────────────────────────

export interface AudienceNarrative {
  hook: string;
  framing: string;
  key_stat: string;
  call_to_action: string;
  tone: string;
}

export interface ChannelStrategyItem {
  rationale: string;
  best_audience: string;
  format: string;
  timing: string;
  priority: "high" | "medium" | "low";
  suggested_content: string;
  hashtags: string[];
  mentions: string[];
  media_suggestion: string;
}

export interface WeeklyObjectiveOutput {
  week_number: number;
  objective: string;
}

export interface StrategyOutput {
  research_summary: string;
  key_findings: string[];
  policy_implications: string[];
  pillar_primary: string;
  pillar_secondary: string | null;
  pillar_rationale: string;
  nu_alignment_tags: string[];
  nu_alignment_mapping: string;
  newsworthiness: string;
  key_messages: string[];
  audience_narratives: Record<string, AudienceNarrative>;
  channel_strategy: Record<string, ChannelStrategyItem>;
  weekly_objectives?: WeeklyObjectiveOutput[];
  fw_values_lead: string;
  fw_causal_chain: string;
  fw_cultural_freight: string;
  fw_thematic_bridge: string;
  fw_solutions_framing: string;
  timing_recommendations: string;
  embargo_notes: string;
  faculty_engagement_plan: string;
  cross_promotion_opps: string[];
}

// ── Deliverable Content Generation ─────────────────────────────────────────

export const DELIVERABLE_CONTENT_SYSTEM_PROMPT = `You are a strategic communications writer for Northwestern Institute for Policy Research (IPR).

Your task is to generate a single publishable social media or content deliverable for a specific channel, audience, and campaign week.

Return ONLY valid JSON — no markdown, no code fences, no explanation.

## Your Inputs
You will receive:
1. The target channel and its character limit
2. The target audience segment
3. The week number and its strategic objective
4. The campaign strategy context (key messages, FrameWorks guidance, audience narratives)

## FrameWorks Institute Methodology
Apply these principles in your content:
1. VALUES LEAD — Open with a broadly shared value, not statistics
2. CAUSAL CHAIN — Explain systemic causes, don't imply individual blame
3. CULTURAL FREIGHT — Avoid activating bootstrap/charity/deserving mindsets
4. EPISODIC → THEMATIC — Bridge personal stories to structural patterns
5. SOLUTIONS FRAMING — Give the audience agency, not passive sympathy

## Channel-Specific Writing Rules
- Social posts (bluesky, twitter, instagram): Concise, punchy, hashtag-friendly. MUST respect character limits.
- LinkedIn: Professional, data-driven, can be longer-form. Include a clear CTA.
- Website/newsletter: Comprehensive, SEO-aware, narrative structure.
- Press release: AP style, quote from PI, journalist-friendly.
- Op-ed: Argumentative, solutions-oriented, 750-800 words.
- Event/podcast: Talking points format, conversational tone.

## Quality Standards
- Content must be COMPLETE DRAFT COPY, not placeholders or summaries
- Lead with the audience narrative hook if one exists for this audience
- Use the weekly objective as strategic direction, not as content to copy
- Respect the key messages — amplify, don't reinterpret
- The content MUST fit within the channel's character limit (if one exists)

## Output Schema
{
  "suggested_content": "<complete draft content for this channel — respect char limit>",
  "narrative_angle": "<the framing/hook used for this audience on this channel>",
  "call_to_action": "<what the audience should do>",
  "hashtags": ["tag1", "tag2"],
  "mentions": ["mention1"],
  "media_suggestion": "<what visual/media to pair with this post>"
}`;

export function buildDeliverableUserMessage(input: {
  channel: string;
  charLimit: number | null;
  audience: string;
  weekNumber: number;
  weekObjective: string;
  stage: string;
  campaignTitle: string;
  keyMessages: string[];
  audienceNarrative: AudienceNarrative | null;
  fwGuidance: {
    values_lead: string;
    causal_chain: string;
    cultural_freight: string;
    thematic_bridge: string;
    solutions_framing: string;
  };
  researchSummary: string;
  userDirection?: string;
}): string {
  const sections: string[] = [];

  sections.push(`Generate a single deliverable for this campaign.

=== TARGET ===
Channel: ${input.channel}${input.charLimit ? ` (${input.charLimit} character limit — content MUST fit)` : " (no character limit)"}
Audience: ${input.audience}
Week: ${input.weekNumber} (stage: ${input.stage})
Campaign: ${input.campaignTitle}`);

  sections.push(`
=== WEEKLY OBJECTIVE (strategic direction for Week ${input.weekNumber}) ===
${input.weekObjective || "No specific objective set for this week."}`);

  sections.push(`
=== RESEARCH CONTEXT ===
${input.researchSummary || "No research summary available."}`);

  if (input.keyMessages.length > 0) {
    sections.push(`
=== KEY MESSAGES (respect these — amplify, don't reinterpret) ===
${input.keyMessages.map((m, i) => `${i + 1}. ${m}`).join("\n")}`);
  }

  if (input.audienceNarrative) {
    const n = input.audienceNarrative;
    sections.push(`
=== AUDIENCE NARRATIVE for ${input.audience} ===
Hook: ${n.hook}
Framing: ${n.framing}
Key stat: ${n.key_stat}
CTA: ${n.call_to_action}
Tone: ${n.tone}`);
  }

  sections.push(`
=== FRAMEWORKS GUIDANCE ===
Values Lead: ${input.fwGuidance.values_lead || "(not set)"}
Causal Chain: ${input.fwGuidance.causal_chain || "(not set)"}
Cultural Freight (avoid): ${input.fwGuidance.cultural_freight || "(not set)"}
Thematic Bridge: ${input.fwGuidance.thematic_bridge || "(not set)"}
Solutions Framing: ${input.fwGuidance.solutions_framing || "(not set)"}`);

  if (input.userDirection?.trim()) {
    sections.push(`
=== USER DIRECTION (prioritize these notes) ===
${input.userDirection.trim()}`);
  }

  return sections.join("\n");
}

// ── Import Prompt Builder (Mechanical — no LLM call) ─────────────────────

export interface ImportPromptDocument {
  role: string;
  title: string;
  content_text: string;
}

export interface ImportPromptStrategy {
  key_messages: string[];
  audience_narratives: Record<string, AudienceNarrative>;
  fw_values_lead: string;
  fw_causal_chain: string;
  fw_cultural_freight: string;
  fw_thematic_bridge: string;
  fw_solutions_framing: string;
}

export interface ImportPromptInput {
  // Campaign metadata
  title: string;
  campaign_type: string;
  duration_weeks: number;
  channels: string[];
  target_audiences: string[];
  research_authors: string[];
  research_doi?: string;
  embargo_until?: string;

  // Documents (embedded in prompt)
  documents: ImportPromptDocument[];

  // Strategy analysis curated subset (optional — might not exist yet)
  strategy?: ImportPromptStrategy | null;
}

/**
 * Build the import prompt string mechanically from campaign data.
 * No LLM call — pure template concatenation. Deterministic output for same inputs.
 *
 * The resulting prompt is designed to be pasted into Claude App (which has
 * campaign blueprints as project knowledge) to generate a CampaignImportSchema JSON.
 */
export function buildImportPrompt(input: ImportPromptInput): string {
  const sections: string[] = [];
  const timestamp = new Date().toISOString();

  // ── Header ────────────────────────────────────────────────────────────
  sections.push(`=== MERIDIAN CAMPAIGN PROMPT ===
Version: ${CAMPAIGN_IMPORT_PROMPT_VERSION}
Generated: ${timestamp}`);

  // ── Campaign Metadata ──────────────────────────────────────────────────
  const channelList = input.channels.length > 0
    ? input.channels.join(", ")
    : "AUTO-MIX: recommend the best channel combination from available channels";

  sections.push(`
== CAMPAIGN ==
Name: ${input.title}
Type: ${input.campaign_type}
Duration: ${input.duration_weeks} weeks
Channels: ${channelList}
Audiences: ${input.target_audiences.join(", ")}
Authors: ${input.research_authors.join(", ") || "Not specified"}
DOI: ${input.research_doi || "N/A"}
Embargo: ${input.embargo_until || "None"}
Start date: Relative (Week 1, Day 1)`);

  // ── Research Documents ──────────────────────────────────────────────────
  const docSections: string[] = [];

  // Priority order: research_notes → ai_brief → supporting → research_paper
  const notes = input.documents.filter((d) => d.role === "research_notes");
  const briefs = input.documents.filter((d) => d.role === "ai_brief");
  const supporting = input.documents.filter((d) => d.role === "supporting");
  const papers = input.documents.filter((d) => d.role === "research_paper");

  if (notes.length > 0) {
    docSections.push(`--- Research Notes (IPR Marketing — primary source) ---`);
    for (const doc of notes) {
      docSections.push(doc.content_text);
    }
  }

  if (briefs.length > 0) {
    docSections.push(`\n--- AI Brief ---`);
    for (const doc of briefs) {
      docSections.push(doc.content_text);
    }
  }

  if (supporting.length > 0) {
    docSections.push(`\n--- Supporting Documents ---`);
    for (const doc of supporting) {
      docSections.push(`[${doc.title}]`);
      docSections.push(doc.content_text);
    }
  }

  if (papers.length > 0) {
    docSections.push(`\n--- Research Paper (reference) ---`);
    for (const doc of papers) {
      // Truncate very long papers to ~4000 words
      const words = doc.content_text.split(/\s+/);
      if (words.length > 4000) {
        docSections.push(
          words.slice(0, 4000).join(" ") +
            "\n\n[Truncated — see Research Notes for curated summary]"
        );
      } else {
        docSections.push(doc.content_text);
      }
    }
  }

  if (docSections.length > 0) {
    sections.push(`\n== RESEARCH CONTEXT ==\n${docSections.join("\n")}`);
  } else {
    sections.push(`\n== RESEARCH CONTEXT ==\nNo documents attached. Generate based on campaign metadata only.`);
  }

  // ── Strategy Anchor (curated subset) ───────────────────────────────────
  if (input.strategy) {
    const s = input.strategy;
    const stratParts: string[] = [];

    stratParts.push(`\n== STRATEGY ANCHOR ==
(Generated by Meridian's Strategy module — use as directional guidance)`);

    // Key messages
    if (s.key_messages.length > 0) {
      stratParts.push(`\nKey Messages:`);
      s.key_messages.forEach((msg, i) => {
        stratParts.push(`  ${i + 1}. ${msg}`);
      });
    }

    // Audience narratives
    if (Object.keys(s.audience_narratives).length > 0) {
      stratParts.push(`\nAudience Narratives:`);
      for (const [audience, narrative] of Object.entries(s.audience_narratives)) {
        stratParts.push(`  [${audience}]`);
        stratParts.push(`    Hook: ${narrative.hook}`);
        stratParts.push(`    Framing: ${narrative.framing}`);
        stratParts.push(`    Key stat: ${narrative.key_stat}`);
        stratParts.push(`    CTA: ${narrative.call_to_action}`);
        stratParts.push(`    Tone: ${narrative.tone}`);
      }
    }

    // FrameWorks guidance
    stratParts.push(`\nFrameWorks Guidance:`);
    stratParts.push(`  Values Lead: ${s.fw_values_lead || "(not generated)"}`);
    stratParts.push(`  Causal Chain: ${s.fw_causal_chain || "(not generated)"}`);
    stratParts.push(`  Cultural Freight (avoid): ${s.fw_cultural_freight || "(not generated)"}`);
    stratParts.push(`  Thematic Bridge: ${s.fw_thematic_bridge || "(not generated)"}`);
    stratParts.push(`  Solutions Framing: ${s.fw_solutions_framing || "(not generated)"}`);

    sections.push(stratParts.join("\n"));
  }

  // ── Channel Specifications ──────────────────────────────────────────────
  const channelSpecs = CAMPAIGN_CHANNELS
    .filter((c) => input.channels.length === 0 || input.channels.includes(c.value))
    .map((c) => `  ${c.value}: ${c.charLimit ? `${c.charLimit} char limit` : "no char limit"}`)
    .join("\n");

  const audienceList = TARGET_AUDIENCES
    .filter((a) => input.target_audiences.includes(a.value))
    .map((a) => `  ${a.value}: ${a.label}`)
    .join("\n");

  // ── Output Instructions ─────────────────────────────────────────────────
  const validChannels = CAMPAIGN_CHANNELS.map((c) => c.value).join(", ");
  const validAudiences = TARGET_AUDIENCES.map((a) => a.value).join(", ");

  sections.push(`
== OUTPUT INSTRUCTIONS ==
Generate a complete campaign calendar as a JSON object.

You MUST follow this exact schema:

{
  "campaign_type": "${input.campaign_type}",
  "duration_weeks": ${input.duration_weeks},
  "channels_used": [list of channels actually used],
  "deliverables": [
    {
      "week_number": <integer, 1 to ${input.duration_weeks}>,
      "day_of_week": "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
      "publish_order": <integer, sequence within that day>,
      "channel": <one of: ${validChannels}>,
      "audience_segment": <one of: ${validAudiences}>,
      "stage": "pre_launch" | "rollout" | "sustain" | "measure",
      "suggested_content": "<COMPLETE draft copy for this channel>",
      "narrative_angle": "<the framing/hook for this audience on this channel>",
      "call_to_action": "<what the audience should do>",
      "hashtags": ["#tag1", "#tag2"],
      "mentions": ["@mention1"],
      "media_suggestion": "<what visual/media to pair>",
      "key_message_ids": [<indices of key messages used, optional>],
      "char_limit": <channel char limit, optional>
    }
  ]
}

Channel specifications:
${channelSpecs}

Target audiences:
${audienceList}

Rules:
- campaign_type MUST be "${input.campaign_type}"
- duration_weeks MUST be ${input.duration_weeks}
- week_number must be between 1 and ${input.duration_weeks}
- Each deliverable is one publishable piece of content
- Distribute content across the full ${input.duration_weeks}-week span
- Use the stage progression: pre_launch → rollout → sustain → measure
- Respect channel character limits listed above
- Content must follow FrameWorks methodology from the Strategy Anchor (if provided)
- suggested_content must be COMPLETE DRAFT COPY, not placeholders or summaries
- hashtags must include the # prefix
- mentions must include the @ prefix
- Return ONLY the JSON object — no markdown, no code fences, no explanation

== END PROMPT ==`);

  return sections.join("\n");
}
