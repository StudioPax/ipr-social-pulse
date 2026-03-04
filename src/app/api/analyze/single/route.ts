/**
 * @api /api/analyze/single — Analyze a single post
 * POST: Trigger analysis for one post, returns JSON (no SSE)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { analyzeWithClaude } from "@/lib/claude";
import { analyzeWithGemini } from "@/lib/gemini";
import {
  toPostForAnalysis,
  ANALYSIS_PROMPT_VERSION,
} from "@/lib/analysis-prompt";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SingleAnalyzeRequest {
  client_id: string;
  post_id: string;
  model: "claude" | "gemini";
}

export async function POST(request: NextRequest) {
  const body: SingleAnalyzeRequest = await request.json();
  const { client_id, post_id, model } = body;

  if (!client_id || !post_id || !model) {
    return NextResponse.json(
      { error: "client_id, post_id, and model are required" },
      { status: 400 }
    );
  }

  // Look up the API key
  const settingKey =
    model === "claude" ? "anthropic_api_key" : "gemini_api_key";
  const { data: keySetting } = await supabase
    .from("client_settings")
    .select("setting_value")
    .eq("client_id", client_id)
    .eq("setting_key", settingKey)
    .single();

  if (!keySetting) {
    return NextResponse.json(
      { error: `No ${model} API key configured. Add it in Settings.` },
      { status: 400 }
    );
  }

  // Look up saved model selection
  const modelSettingKey =
    model === "claude" ? "anthropic_model" : "gemini_model";
  const { data: modelSetting } = await supabase
    .from("client_settings")
    .select("setting_value")
    .eq("client_id", client_id)
    .eq("setting_key", modelSettingKey)
    .single();

  const selectedModel =
    modelSetting?.setting_value ||
    (model === "claude" ? "claude-sonnet-4-20250514" : "gemini-3-pro-preview");

  // Fetch the post
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select(
      "id, content_text, platform, published_at, engagement_total, hashtags, content_url"
    )
    .eq("id", post_id)
    .eq("client_id", client_id)
    .single();

  if (postError || !post) {
    return NextResponse.json(
      { error: "Post not found" },
      { status: 404 }
    );
  }

  const t0 = Date.now();

  try {
    const postForAnalysis = toPostForAnalysis(post);
    const result =
      model === "claude"
        ? await analyzeWithClaude(
            keySetting.setting_value,
            [postForAnalysis],
            selectedModel
          )
        : await analyzeWithGemini(
            keySetting.setting_value,
            [postForAnalysis],
            selectedModel
          );

    if (result.results.length === 0) {
      return NextResponse.json(
        { error: "No analysis result returned from LLM" },
        { status: 500 }
      );
    }

    const analysisResult = result.results[0];

    // Upsert into post_analyses
    const { error: upsertError } = await supabase
      .from("post_analyses")
      .upsert(
        {
          post_id: analysisResult.post_id,
          analyzed_at: new Date().toISOString(),
          pillar_primary: analysisResult.pillar_primary,
          pillar_secondary: analysisResult.pillar_secondary,
          pillar_confidence: analysisResult.pillar_confidence,
          pillar_rationale: analysisResult.pillar_rationale,
          sentiment_label: analysisResult.sentiment_label,
          sentiment_score: analysisResult.sentiment_score,
          sentiment_confidence: analysisResult.sentiment_confidence,
          content_type: analysisResult.content_type,
          audience_fit: analysisResult.audience_fit,
          policy_relevance: analysisResult.policy_relevance,
          performance_tier: analysisResult.performance_tier,
          recommended_action: analysisResult.recommended_action,
          nu_alignment_tags: analysisResult.nu_alignment_tags,
          research_title: analysisResult.research_title,
          research_url: analysisResult.research_url,
          research_authors: analysisResult.research_authors,
          research_confidence: analysisResult.research_confidence,
          sentiment_rationale: analysisResult.sentiment_rationale,
          policy_relevance_rationale: analysisResult.policy_relevance_rationale,
          tier_rationale: analysisResult.tier_rationale,
          key_topics: analysisResult.key_topics,
          summary: analysisResult.summary,
          fw_values_lead_score: analysisResult.fw_values_lead_score,
          fw_values_lead_eval: analysisResult.fw_values_lead_eval,
          fw_causal_chain_score: analysisResult.fw_causal_chain_score,
          fw_causal_chain_eval: analysisResult.fw_causal_chain_eval,
          fw_cultural_freight_score: analysisResult.fw_cultural_freight_score,
          fw_cultural_freight_eval: analysisResult.fw_cultural_freight_eval,
          fw_episodic_thematic_score: analysisResult.fw_episodic_thematic_score,
          fw_episodic_thematic_eval: analysisResult.fw_episodic_thematic_eval,
          fw_solutions_framing_score: analysisResult.fw_solutions_framing_score,
          fw_solutions_framing_eval: analysisResult.fw_solutions_framing_eval,
          fw_overall_score: analysisResult.fw_overall_score,
          fw_rewrite_rec: analysisResult.fw_rewrite_rec,
          llm_response_raw: result.raw as Database["public"]["Tables"]["post_analyses"]["Row"]["llm_response_raw"],
          model_version: selectedModel,
          prompt_version: ANALYSIS_PROMPT_VERSION,
        },
        { onConflict: "post_id" }
      );

    if (upsertError) {
      return NextResponse.json(
        { error: `Failed to save analysis: ${upsertError.message}` },
        { status: 500 }
      );
    }

    // Update pillar_tag on the post
    await supabase
      .from("posts")
      .update({ pillar_tag: analysisResult.pillar_primary })
      .eq("id", post_id);

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      model: selectedModel,
      latencyMs: Date.now() - t0,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Analysis failed: ${msg}` },
      { status: 500 }
    );
  }
}
