/**
 * @api GET/POST /api/dashboard/insights — AI-generated dashboard insights
 * Module 5 — Dashboard Enhancement
 *
 * GET: Retrieve cached insights for a date range
 * POST: Generate new insights via Claude, upsert into dashboard_insights
 *
 * Follows the same pattern as generate-audience/route.ts (non-SSE, JSON return).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import type { Database } from "@/types/database";
import { buildInsightsUserMessage } from "@/lib/dashboard-insights-prompt";
import { loadPrompt } from "@/lib/prompt-loader";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const FALLBACK_MODEL = "claude-sonnet-4-20250514";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("client_id");
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");

    if (!clientId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "client_id, start, and end are required" },
        { status: 400 }
      );
    }

    const { data } = await supabase
      .from("dashboard_insights")
      .select("*")
      .eq("client_id", clientId)
      .eq("date_range_start", startDate)
      .eq("date_range_end", endDate)
      .single();

    if (!data) {
      return NextResponse.json({ insights: null, generated_at: null });
    }

    return NextResponse.json({
      insights: data.insights,
      generated_at: data.generated_at,
      model_version: data.model_version,
      post_count: data.post_count,
      analyzed_count: data.analyzed_count,
    });
  } catch {
    return NextResponse.json({ insights: null, generated_at: null });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { client_id, start_date, end_date, metrics } = body;

    if (!client_id || !start_date || !end_date || !metrics) {
      return NextResponse.json(
        { error: "client_id, start_date, end_date, and metrics are required" },
        { status: 400 }
      );
    }

    // Get API key from client_settings
    const { data: setting } = await supabase
      .from("client_settings")
      .select("setting_value")
      .eq("client_id", client_id)
      .eq("setting_key", "anthropic_api_key")
      .single();

    if (!setting?.setting_value) {
      return NextResponse.json(
        { error: "Claude API key not configured. Add it in Settings." },
        { status: 400 }
      );
    }

    // Look up saved model selection
    const { data: modelSetting } = await supabase
      .from("client_settings")
      .select("setting_value")
      .eq("client_id", client_id)
      .eq("setting_key", "anthropic_model")
      .single();

    const selectedModel = modelSetting?.setting_value || FALLBACK_MODEL;

    const prompt = await loadPrompt(client_id, "dashboard-insights");
    const userMessage = buildInsightsUserMessage(metrics);

    const client = new Anthropic({ apiKey: setting.setting_value });

    const response = await client.messages.create({
      model: selectedModel,
      max_tokens: prompt.maxTokens,
      temperature: prompt.temperature,
      system: prompt.systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text content in Claude response");
    }

    // Strip markdown fences if present (model sometimes wraps in ```json ... ```)
    let rawText = textBlock.text.trim();
    if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    const insights = JSON.parse(rawText);

    // Validate required fields
    const requiredFields = [
      "executive_summary",
      "sentiment_commentary",
      "tier_commentary",
      "pillar_commentary",
      "messaging_commentary",
      "recommendations",
    ];
    for (const field of requiredFields) {
      if (!insights[field]) {
        throw new Error(`Missing field in generated insights: ${field}`);
      }
    }

    // Upsert into dashboard_insights
    const { data: upserted, error: upsertError } = await supabase
      .from("dashboard_insights")
      .upsert(
        {
          client_id,
          date_range_start: start_date,
          date_range_end: end_date,
          insights,
          generated_at: new Date().toISOString(),
          model_version: `${prompt.version}/${selectedModel}`,
          post_count: metrics.totalPosts || 0,
          analyzed_count: metrics.analyzedCount || 0,
        },
        { onConflict: "client_id,date_range_start,date_range_end" }
      )
      .select()
      .single();

    if (upsertError) {
      throw new Error(`Failed to save insights: ${upsertError.message}`);
    }

    return NextResponse.json({
      insights: upserted.insights,
      generated_at: upserted.generated_at,
      model_version: upserted.model_version,
      post_count: upserted.post_count,
      analyzed_count: upserted.analyzed_count,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
