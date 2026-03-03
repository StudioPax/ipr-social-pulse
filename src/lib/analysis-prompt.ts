// @module analysis-prompt — Shared prompt template for AI analysis
// App Spec Module 3 — LLM Analysis Engine

import { PILLARS, PERFORMANCE_TIERS, RECOMMENDED_ACTIONS } from "@/lib/tokens";

export const ANALYSIS_PROMPT_VERSION = "v1.1";

/** Shape of a post sent to the LLM for analysis */
export interface PostForAnalysis {
  id: string;
  content_text: string;
  platform: string;
  published_at: string;
  engagement_total: number;
  hashtags: string[];
  content_url: string | null;
}

/** Shape of a single post analysis result from the LLM */
export interface PostAnalysisResult {
  post_id: string;
  pillar_primary: string;
  pillar_secondary: string | null;
  pillar_confidence: number;
  pillar_rationale: string;
  sentiment_label: string;
  sentiment_score: number;
  sentiment_confidence: number;
  content_type: string;
  audience_fit: string;
  policy_relevance: number;
  performance_tier: string;
  recommended_action: string;
  nu_alignment_tags: string[];
  research_title: string | null;
  research_url: string | null;
  research_authors: string[];
  research_confidence: number;
}

/** Build the system prompt for IPR post analysis */
export function buildSystemPrompt(): string {
  return `You are an AI analyst for Northwestern Institute for Policy Research (IPR).
Your task is to analyze social media posts and classify them according to IPR's policy framework.
Return ONLY valid JSON — no markdown, no code fences, no explanation.

## IPR Policy Pillars
${PILLARS.map((p) => `- **${p}**`).join("\n")}

Pillar definitions:
- Health: Health policy, public health, healthcare systems, biomedical research
- Democracy: Democratic institutions, governance, civic engagement, voting, political behavior
- Methods: Research methods, data science, computational approaches, statistics, survey methodology
- Opportunity: Economic opportunity, inequality, social mobility, education, labor markets
- Sustainability: Environmental policy, climate change, energy, urban planning

## Performance Tiers
${PERFORMANCE_TIERS.map((t) => `- ${t}`).join("\n")}

Tier assignment rules:
- T1_PolicyEngine: engagement_total >= 20 AND policy_relevance >= 0.6
- T2_Visibility: engagement_total >= 20 AND policy_relevance < 0.6
- T3_Niche: engagement_total < 20 AND policy_relevance >= 0.6
- T4_Underperformer: engagement_total < 20 AND policy_relevance < 0.6

## Recommended Actions
${RECOMMENDED_ACTIONS.map((a) => `- ${a}`).join("\n")}

Action mapping:
- T1 → amplify (boost this high-performing policy content)
- T2 → template (use as model for future policy-aligned posts)
- T3 → promote_niche (invest in promoting under-amplified policy content)
- T4 → diagnose (investigate why this underperforms)
- Any post with policy_relevance < 0.2 → archive

## Sentiment Classification Rules
IMPORTANT: Sentiment reflects the **communicative intent** of the post, NOT the topic being discussed.
- A post promoting faculty research about a negative topic (e.g., rising bias, health disparities, climate damage) should be classified as **positive** or **neutral** — because the intent is to celebrate or share IPR scholarship.
- A post expressing concern, criticism, or disappointment about IPR or its work should be classified as **negative**.
- Use **mixed** only when the post genuinely expresses conflicting sentiments (e.g., celebrating a grant while mourning a colleague).
- Use **negative** only when the post's own tone/framing is negative (e.g., lamenting funding cuts, reporting institutional setbacks).

Examples:
- "New research shows rising inequality" (promoting research) → positive or neutral
- "Alarming new findings on bias" (promoting research with urgent framing) → neutral
- "Disappointed by the funding decision" (expressing frustration) → negative

## Content Types
- research_promo: Promoting IPR research, publications, working papers
- achievement: Faculty awards, milestones, recognitions, grants
- policy: Policy commentary, analysis, op-eds, advocacy
- event: Events, lectures, panels, conferences, seminars
- general: Other/miscellaneous content

## Audience Fit
- policymaker: Content relevant to government officials, legislators
- faculty: Content relevant to academics and researchers
- donor: Content relevant to funders and philanthropists
- public: Content for general audience
- mixed: Multiple audience types

## NU Alignment Tags
Tag with any applicable Northwestern strategic areas:
- feinberg: Feinberg School of Medicine connections
- trienens: Trienens Institute for Sustainability connections
- ai_data: AI and data science initiatives
- none: No specific NU alignment

## Output Schema
For each post, return a JSON object with these exact fields:
{
  "post_id": "the post UUID provided",
  "pillar_primary": "one of: ${PILLARS.join(" | ")}",
  "pillar_secondary": "one of the pillars or null",
  "pillar_confidence": 0.0-1.0,
  "pillar_rationale": "1-2 sentence explanation",
  "sentiment_label": "positive | neutral | negative | mixed",
  "sentiment_score": -1.0 to 1.0,
  "sentiment_confidence": 0.0-1.0,
  "content_type": "research_promo | achievement | policy | event | general",
  "audience_fit": "policymaker | faculty | donor | public | mixed",
  "policy_relevance": 0.0-1.0,
  "performance_tier": "T1_PolicyEngine | T2_Visibility | T3_Niche | T4_Underperformer",
  "recommended_action": "amplify | template | promote_niche | diagnose | archive",
  "nu_alignment_tags": ["feinberg", "trienens", "ai_data", or "none"],
  "research_title": "detected research title or null",
  "research_url": "detected research URL or null",
  "research_authors": ["detected author names"] or [],
  "research_confidence": 0.0-1.0
}

Return a JSON array of objects, one per post. Nothing else.`;
}

/** Format a batch of posts into the user message */
export function buildUserMessage(posts: PostForAnalysis[]): string {
  const formatted = posts
    .map(
      (post, i) =>
        `--- Post ${i + 1} ---
ID: ${post.id}
Platform: ${post.platform}
Published: ${post.published_at}
Engagement: ${post.engagement_total}
Hashtags: ${post.hashtags.length > 0 ? post.hashtags.join(", ") : "none"}
URL: ${post.content_url || "none"}

${post.content_text}`
    )
    .join("\n\n");

  return `Analyze these ${posts.length} social media posts from Northwestern IPR. Return a JSON array with one analysis object per post.\n\n${formatted}`;
}

/** Parse and validate LLM JSON response */
export function parseAnalysisResponse(raw: string): PostAnalysisResult[] {
  // Try direct JSON parse first
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Try extracting JSON from markdown code fences
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1].trim());
    } else {
      // Try finding array brackets
      const arrayMatch = raw.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        parsed = JSON.parse(arrayMatch[0]);
      } else {
        throw new Error("Could not extract JSON from LLM response");
      }
    }
  }

  // Ensure it's an array
  const results = Array.isArray(parsed) ? parsed : [parsed];

  // Validate each result has required fields
  return results.map((r: Record<string, unknown>) => ({
    post_id: String(r.post_id || ""),
    pillar_primary: String(r.pillar_primary || "Health"),
    pillar_secondary: r.pillar_secondary ? String(r.pillar_secondary) : null,
    pillar_confidence: Number(r.pillar_confidence) || 0.5,
    pillar_rationale: String(r.pillar_rationale || ""),
    sentiment_label: String(r.sentiment_label || "neutral"),
    sentiment_score: Number(r.sentiment_score) || 0,
    sentiment_confidence: Number(r.sentiment_confidence) || 0.5,
    content_type: String(r.content_type || "general"),
    audience_fit: String(r.audience_fit || "mixed"),
    policy_relevance: Number(r.policy_relevance) || 0.3,
    performance_tier: String(r.performance_tier || "T4_Underperformer"),
    recommended_action: String(r.recommended_action || "diagnose"),
    nu_alignment_tags: Array.isArray(r.nu_alignment_tags)
      ? r.nu_alignment_tags.map(String)
      : ["none"],
    research_title: r.research_title ? String(r.research_title) : null,
    research_url: r.research_url ? String(r.research_url) : null,
    research_authors: Array.isArray(r.research_authors)
      ? r.research_authors.map(String)
      : [],
    research_confidence: Number(r.research_confidence) || 0,
  }));
}
