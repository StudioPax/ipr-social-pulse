/**
 * @api POST /api/campaigns/[id]/generate-deliverable — AI-generate a single deliverable
 * Module 7 — Content Campaigns
 *
 * Generates content for a single channel deliverable using Claude, then creates
 * the campaign_channels row. Requires a strategy to exist for the campaign.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import type { Database } from "@/types/database";
import { loadPrompt } from "@/lib/prompt-loader";
import { buildDeliverableUserMessage } from "@/lib/campaign-prompt";
import { CAMPAIGN_CHANNELS } from "@/lib/tokens";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const FALLBACK_MODEL = "claude-sonnet-4-20250514";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id;
    const body = await request.json();
    const { client_id, channel, audience_segment, stage, week_number } = body;

    if (!channel || !audience_segment || !week_number) {
      return NextResponse.json(
        { error: "channel, audience_segment, and week_number are required" },
        { status: 400 }
      );
    }

    // Get API key
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

    // Get model selection
    const { data: modelSetting } = await supabase
      .from("client_settings")
      .select("setting_value")
      .eq("client_id", client_id)
      .eq("setting_key", "anthropic_model")
      .single();

    const selectedModel = modelSetting?.setting_value || FALLBACK_MODEL;

    // Get campaign + strategy
    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .select("title")
      .eq("id", campaignId)
      .single();

    if (campErr || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const { data: analysis } = await supabase
      .from("campaign_analyses")
      .select(
        "research_summary, key_messages, audience_narratives, weekly_objectives, fw_values_lead, fw_causal_chain, fw_cultural_freight, fw_thematic_bridge, fw_solutions_framing"
      )
      .eq("campaign_id", campaignId)
      .single();

    if (!analysis) {
      return NextResponse.json(
        { error: "Campaign strategy not found. Generate a strategy first." },
        { status: 400 }
      );
    }

    // Resolve channel char limit
    const channelDef = CAMPAIGN_CHANNELS.find((c) => c.value === channel);
    const charLimit = channelDef?.charLimit ?? null;

    // Resolve week objective
    const weeklyObjectives = (analysis.weekly_objectives as Array<{ week_number: number; objective: string }>) || [];
    const weekObj = weeklyObjectives.find((o) => o.week_number === week_number);

    // Resolve audience narrative
    const audienceNarratives = (analysis.audience_narratives as Record<string, { hook: string; framing: string; key_stat: string; call_to_action: string; tone: string }>) || {};
    const audienceNarrative = audienceNarratives[audience_segment] || null;

    // Load prompt template
    const prompt = await loadPrompt(client_id, "deliverable-content");

    // Build user message
    const userMessage = buildDeliverableUserMessage({
      channel,
      charLimit,
      audience: audience_segment,
      weekNumber: week_number,
      weekObjective: weekObj?.objective || "",
      stage: stage || "rollout",
      campaignTitle: campaign.title,
      keyMessages: (analysis.key_messages as string[]) || [],
      audienceNarrative,
      fwGuidance: {
        values_lead: (analysis.fw_values_lead as string) || "",
        causal_chain: (analysis.fw_causal_chain as string) || "",
        cultural_freight: (analysis.fw_cultural_freight as string) || "",
        thematic_bridge: (analysis.fw_thematic_bridge as string) || "",
        solutions_framing: (analysis.fw_solutions_framing as string) || "",
      },
      researchSummary: (analysis.research_summary as string) || "",
    });

    // Call Claude
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

    // Parse JSON response
    let rawText = textBlock.text.trim();
    if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    const generated = JSON.parse(rawText);

    if (!generated.suggested_content) {
      throw new Error("AI did not generate suggested_content");
    }

    // Clean hashtags (strip # prefix for storage)
    const hashtags = (generated.hashtags || []).map((t: string) =>
      t.replace(/^#/, "")
    );
    const mentions = (generated.mentions || []).map((m: string) =>
      m.replace(/^@/, "")
    );

    // Create the channel entry
    const { data: newChannel, error: insertErr } = await supabase
      .from("campaign_channels")
      .insert({
        campaign_id: campaignId,
        channel,
        audience_segment,
        stage: stage || "rollout",
        week_number,
        suggested_content: generated.suggested_content,
        narrative_angle: generated.narrative_angle || null,
        call_to_action: generated.call_to_action || null,
        hashtags: hashtags.length > 0 ? hashtags : null,
        mentions: mentions.length > 0 ? mentions : null,
        media_suggestion: generated.media_suggestion || null,
        char_limit: charLimit,
        status: "drafted",
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json({ channel: newChannel }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
