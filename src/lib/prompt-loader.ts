// @module prompt-loader — Runtime prompt fetcher with DB + fallback
// Loads active system prompts from prompt_templates table, falls back to code defaults.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Hardcoded fallback imports (existing prompt files kept as-is)
import { buildSystemPrompt as buildAnalysisSystemPrompt, ANALYSIS_PROMPT_VERSION } from "@/lib/analysis-prompt";
import { buildInsightsSystemPrompt, DASHBOARD_INSIGHTS_PROMPT_VERSION } from "@/lib/dashboard-insights-prompt";
import {
  BRIEF_SYSTEM_PROMPT,
  STRATEGY_SYSTEM_PROMPT,
  CAMPAIGN_BRIEF_PROMPT_VERSION,
  CAMPAIGN_STRATEGY_PROMPT_VERSION,
} from "@/lib/campaign-prompt";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type PromptSlug =
  | "post-analysis"
  | "dashboard-insights"
  | "campaign-brief"
  | "campaign-strategy"
  | "audience-narrative";

export interface LoadedPrompt {
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  version: string;
  source: "db" | "fallback";
}

/** Default audience narrative system prompt (extracted from inline route) */
const AUDIENCE_NARRATIVE_SYSTEM_PROMPT = `You are a strategic communications expert specializing in research communication for policy institutes.

Given the campaign context below, generate a targeted audience narrative for: {{audience_description}}

Return a JSON object with exactly these 5 fields:
{
  "hook": "An opening hook that grabs this audience's attention — 1-2 sentences",
  "framing": "How to frame the research for this audience — what angle resonates — 1-2 sentences",
  "key_stat": "The single most compelling statistic or finding for this audience",
  "call_to_action": "What you want this audience to do after engaging — 1 sentence",
  "tone": "The recommended tone for communications to this audience — 2-4 words"
}

Return ONLY the JSON object, no markdown fences or extra text.`;

/** Hardcoded fallback map — uses existing prompt file exports */
const FALLBACK_PROMPTS: Record<PromptSlug, () => Omit<LoadedPrompt, "source">> = {
  "post-analysis": () => ({
    systemPrompt: buildAnalysisSystemPrompt(),
    temperature: 0,
    maxTokens: 16384,
    version: ANALYSIS_PROMPT_VERSION,
  }),
  "dashboard-insights": () => ({
    systemPrompt: buildInsightsSystemPrompt(),
    temperature: 0.3,
    maxTokens: 2048,
    version: DASHBOARD_INSIGHTS_PROMPT_VERSION,
  }),
  "campaign-brief": () => ({
    systemPrompt: BRIEF_SYSTEM_PROMPT,
    temperature: 0,
    maxTokens: 4096,
    version: CAMPAIGN_BRIEF_PROMPT_VERSION,
  }),
  "campaign-strategy": () => ({
    systemPrompt: STRATEGY_SYSTEM_PROMPT,
    temperature: 0,
    maxTokens: 8192,
    version: CAMPAIGN_STRATEGY_PROMPT_VERSION,
  }),
  "audience-narrative": () => ({
    systemPrompt: AUDIENCE_NARRATIVE_SYSTEM_PROMPT,
    temperature: 0.7,
    maxTokens: 1024,
    version: "audience-v1.0",
  }),
};

/**
 * Load the active prompt for a given slug.
 * Queries prompt_templates for is_active=true row, falls back to hardcoded defaults.
 *
 * @param clientId - The client UUID
 * @param slug - The prompt identifier
 * @param replacements - Optional key-value pairs for {{placeholder}} replacement
 *                       e.g., { audience_description: "Policymakers — ..." }
 */
export async function loadPrompt(
  clientId: string,
  slug: PromptSlug,
  replacements?: Record<string, string>
): Promise<LoadedPrompt> {
  try {
    const { data } = await supabase
      .from("prompt_templates")
      .select("system_prompt, temperature, max_tokens, version")
      .eq("client_id", clientId)
      .eq("slug", slug)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      let systemPrompt = data.system_prompt;
      if (replacements) {
        for (const [key, value] of Object.entries(replacements)) {
          systemPrompt = systemPrompt.replaceAll(`{{${key}}}`, value);
        }
      }
      return {
        systemPrompt,
        temperature: data.temperature,
        maxTokens: data.max_tokens,
        version: data.version,
        source: "db",
      };
    }
  } catch {
    // DB query failed — fall through to fallback
  }

  // Fallback to hardcoded
  const fallback = FALLBACK_PROMPTS[slug]();
  let systemPrompt = fallback.systemPrompt;
  if (replacements) {
    for (const [key, value] of Object.entries(replacements)) {
      systemPrompt = systemPrompt.replaceAll(`{{${key}}}`, value);
    }
  }
  return { ...fallback, systemPrompt, source: "fallback" };
}
