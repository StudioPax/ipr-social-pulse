/**
 * @api POST /api/campaigns/[id]/generate-audience — Generate audience narrative via LLM
 * Module 7 — Content Campaigns
 *
 * Generates a single AudienceNarrative for a new audience segment using Claude.
 * Lightweight single-shot call (no SSE streaming needed).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import type { Database } from "@/types/database";
import { loadPrompt } from "@/lib/prompt-loader";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const FALLBACK_MODEL = "claude-sonnet-4-20250514";

const AUDIENCE_LABELS: Record<string, string> = {
  policymaker: "Policymakers — government officials, legislative staff, regulatory bodies",
  faculty: "Faculty — academic researchers, university professors, scholars",
  donor: "Donors — philanthropic funders, foundation officers, major gift prospects",
  public: "General Public — informed citizens, community members, taxpayers",
  media: "Media — journalists, editors, science communicators, bloggers",
  nu_leadership: "Northwestern Leadership — university administrators, deans, provosts",
};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: campaignId } = params;
    const body = await request.json();
    const { client_id, audience_key, campaign_context } = body;

    if (!audience_key || !campaign_context) {
      return NextResponse.json(
        { error: "audience_key and campaign_context are required" },
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

    const audienceDescription = AUDIENCE_LABELS[audience_key] || audience_key;

    // Load prompt from DB (with audience_description placeholder replacement) or fallback
    const prompt = await loadPrompt(client_id, "audience-narrative", {
      audience_description: audienceDescription,
    });

    const userMessage = `Campaign Context:

Research Summary: ${campaign_context.research_summary || "Not available"}

Key Messages:
${(campaign_context.key_messages || []).map((m: string, i: number) => `${i + 1}. ${m}`).join("\n") || "Not available"}

Generate the audience narrative for: ${audienceDescription}`;

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

    // Strip markdown fences if present, then parse JSON
    let rawText = textBlock.text.trim();
    if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    const narrative = JSON.parse(rawText);

    // Validate required fields
    const requiredFields = ["hook", "framing", "key_stat", "call_to_action", "tone"];
    for (const field of requiredFields) {
      if (!narrative[field]) {
        throw new Error(`Missing field in generated narrative: ${field}`);
      }
    }

    return NextResponse.json({
      audience_narrative: narrative,
      audience_key,
      campaign_id: campaignId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
