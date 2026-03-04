/**
 * @api POST /api/campaigns/[id]/generate-strategy — Generate Campaign Strategy (SSE stream)
 * Module 7 — Content Campaigns, Operation 2 (Core)
 *
 * Reads all included campaign documents, sends to LLM, saves strategy + channel plans.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  STRATEGY_SYSTEM_PROMPT,
  buildStrategyUserMessage,
  CAMPAIGN_STRATEGY_PROMPT_VERSION,
  type StrategyOutput,
  type StrategyDocument,
} from "@/lib/campaign-prompt";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface GenerateStrategyRequest {
  client_id: string;
  model: "claude" | "gemini";
  target_audiences: string[];
  channels: string[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: campaignId } = params;
  const body: GenerateStrategyRequest = await request.json();
  const { client_id, model, target_audiences, channels } = body;

  if (!client_id || !model) {
    return NextResponse.json(
      { error: "client_id and model are required" },
      { status: 400 }
    );
  }

  if (!target_audiences?.length) {
    return NextResponse.json(
      { error: "At least one target audience is required" },
      { status: 400 }
    );
  }

  if (!channels?.length) {
    return NextResponse.json(
      { error: "At least one channel is required" },
      { status: 400 }
    );
  }

  // Look up API key
  const settingKey = model === "claude" ? "anthropic_api_key" : "gemini_api_key";
  const { data: setting } = await supabase
    .from("client_settings")
    .select("setting_value")
    .eq("client_id", client_id)
    .eq("setting_key", settingKey)
    .single();

  if (!setting) {
    return NextResponse.json(
      { error: `No ${model} API key configured. Add it in Settings.` },
      { status: 400 }
    );
  }

  const apiKey = setting.setting_value;

  // Get campaign + included documents
  const [campaignRes, docsRes] = await Promise.all([
    supabase.from("campaigns").select("*").eq("id", campaignId).single(),
    supabase
      .from("campaign_documents")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("is_included", true)
      .order("sort_order"),
  ]);

  if (campaignRes.error || !campaignRes.data) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const campaign = campaignRes.data;
  const docs = docsRes.data || [];

  if (docs.length === 0) {
    return NextResponse.json(
      { error: "No included documents found. Add and include at least one document." },
      { status: 400 }
    );
  }

  // Stream SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(level: string, message: string, data?: Record<string, unknown>) {
        const event = JSON.stringify({ level, message, ...data });
        controller.enqueue(encoder.encode(`data: ${event}\n\n`));
      }

      try {
        const modelVersion = model === "claude" ? "claude-sonnet-4-20250514" : "gemini-3-pro-preview";
        send("info", `Generating Strategy for "${campaign.title}"`);
        send("info", `Model: ${model} (${modelVersion}), prompt ${CAMPAIGN_STRATEGY_PROMPT_VERSION}`);
        send("info", `Documents: ${docs.length} included`);

        // List documents by role
        const byRole: Record<string, number> = {};
        for (const doc of docs) {
          byRole[doc.document_role] = (byRole[doc.document_role] || 0) + 1;
        }
        const roleList = Object.entries(byRole)
          .map(([role, count]) => `${role} (${count})`)
          .join(", ");
        send("info", `Document roles: ${roleList}`);

        const hasNotes = docs.some((d) => d.document_role === "research_notes");
        if (!hasNotes) {
          send("warn", "No Research Notes found — AI will use available documents as context. Consider adding Research Notes for better results.");
        }

        send("info", `Target audiences: ${target_audiences.join(", ")}`);
        send("info", `Channels: ${channels.join(", ")}`);

        // Build prompt documents
        const strategyDocs: StrategyDocument[] = docs.map((d) => ({
          id: d.id,
          role: d.document_role,
          title: d.title,
          content_text: d.content_text || "",
          word_count: d.word_count || 0,
        }));

        const totalWords = strategyDocs.reduce((sum, d) => sum + d.word_count, 0);
        send("info", `Total context: ~${totalWords.toLocaleString()} words`);

        const userMessage = buildStrategyUserMessage({
          title: campaign.title,
          research_authors: campaign.research_authors || [],
          research_doi: campaign.research_doi || undefined,
          embargo_until: campaign.embargo_until || undefined,
          target_audiences,
          channels,
          documents: strategyDocs,
        });

        send("info", "Sending to AI...");
        const t0 = Date.now();

        let responseText: string;

        if (model === "claude") {
          const client = new Anthropic({ apiKey });
          const response = await client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 8192,
            temperature: 0,
            system: STRATEGY_SYSTEM_PROMPT,
            messages: [{ role: "user", content: userMessage }],
          });
          const textBlock = response.content.find((b) => b.type === "text");
          if (!textBlock || textBlock.type !== "text") {
            throw new Error("No text content in Claude response");
          }
          responseText = textBlock.text;
        } else {
          const genAI = new GoogleGenerativeAI(apiKey);
          const geminiModel = genAI.getGenerativeModel({
            model: "gemini-3-pro-preview",
            systemInstruction: STRATEGY_SYSTEM_PROMPT,
            generationConfig: { temperature: 0, responseMimeType: "application/json" },
          });
          const result = await geminiModel.generateContent(userMessage);
          responseText = result.response.text();
        }

        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        send("success", `Response received in ${elapsed}s`);

        // Parse JSON
        let strategyOutput: StrategyOutput;
        try {
          const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          strategyOutput = JSON.parse(cleaned);
        } catch {
          send("error", "Failed to parse AI response as JSON");
          send("error", `Raw response (first 500 chars): ${responseText.slice(0, 500)}`);
          controller.close();
          return;
        }

        send("info", "Parsed strategy successfully");

        // Save/update campaign_analyses — map StrategyOutput fields to DB columns
        const analysisPayload = {
          campaign_id: campaignId,
          research_summary: strategyOutput.research_summary || "",
          key_findings: strategyOutput.key_findings || [],
          policy_implications: strategyOutput.policy_implications || [],
          key_messages: strategyOutput.key_messages || [],
          pillar_rationale: strategyOutput.pillar_rationale || "",
          newsworthiness: strategyOutput.newsworthiness || "",
          audience_narratives: (strategyOutput.audience_narratives || {}) as unknown as Json,
          channel_strategy: (strategyOutput.channel_strategy || {}) as unknown as Json,
          fw_values_lead: strategyOutput.fw_values_lead || "",
          fw_causal_chain: strategyOutput.fw_causal_chain || "",
          fw_cultural_freight: strategyOutput.fw_cultural_freight || "",
          fw_thematic_bridge: strategyOutput.fw_thematic_bridge || "",
          fw_solutions_framing: strategyOutput.fw_solutions_framing || "",
          timing_recommendations: strategyOutput.timing_recommendations || "",
          embargo_notes: strategyOutput.embargo_notes || "",
          faculty_engagement_plan: strategyOutput.faculty_engagement_plan || "",
          nu_alignment_mapping: strategyOutput.nu_alignment_mapping || "",
          cross_promotion_opps: strategyOutput.cross_promotion_opps || [],
          llm_response_raw: strategyOutput as unknown as Json,
          model_version: modelVersion,
          prompt_version: CAMPAIGN_STRATEGY_PROMPT_VERSION,
          analyzed_at: new Date().toISOString(),
        };

        const { data: existingAnalysis } = await supabase
          .from("campaign_analyses")
          .select("id")
          .eq("campaign_id", campaignId)
          .single();

        if (existingAnalysis) {
          const { error: updateError } = await supabase
            .from("campaign_analyses")
            .update(analysisPayload)
            .eq("id", existingAnalysis.id);
          if (updateError) {
            send("error", `Failed to update analysis: ${updateError.message}`);
          } else {
            send("success", "Strategy analysis updated");
          }
        } else {
          const { error: insertError } = await supabase
            .from("campaign_analyses")
            .insert(analysisPayload);
          if (insertError) {
            send("error", `Failed to save analysis: ${insertError.message}`);
          } else {
            send("success", "Strategy analysis saved");
          }
        }

        // Create/update channel plans from strategy output
        if (strategyOutput.channel_strategy) {
          send("info", "Creating channel plans...");
          let channelCount = 0;

          for (const [channel, plan] of Object.entries(strategyOutput.channel_strategy)) {
            if (!channels.includes(channel)) continue;

            const channelPayload = {
              campaign_id: campaignId,
              channel,
              audience_segment: plan.best_audience || target_audiences[0],
              suggested_content: plan.suggested_content || "",
              hashtags: plan.hashtags || [],
              mentions: plan.mentions || [],
              media_suggestion: plan.media_suggestion || null,
              status: "planned" as const,
              phase: "launch" as const,
              publish_order: channelCount,
            };

            // Check for existing channel plan
            const { data: existingChannel } = await supabase
              .from("campaign_channels")
              .select("id")
              .eq("campaign_id", campaignId)
              .eq("channel", channel)
              .single();

            if (existingChannel) {
              const { error: updateErr } = await supabase
                .from("campaign_channels")
                .update({
                  suggested_content: channelPayload.suggested_content,
                  hashtags: channelPayload.hashtags,
                  mentions: channelPayload.mentions,
                  media_suggestion: channelPayload.media_suggestion,
                  audience_segment: channelPayload.audience_segment,
                })
                .eq("id", existingChannel.id);
              if (updateErr) {
                send("error", `Failed to update ${channel}: ${updateErr.message}`);
                continue;
              }
            } else {
              const { error: insertErr } = await supabase
                .from("campaign_channels")
                .insert(channelPayload);
              if (insertErr) {
                send("error", `Failed to create ${channel}: ${insertErr.message}`);
                continue;
              }
            }

            channelCount++;
            send("info", `Channel plan: ${channel} → ${plan.best_audience} (${plan.priority} priority)`);
          }

          send("success", `${channelCount} channel plan(s) created/updated`);
        }

        // Update campaign metadata
        const updatePayload: Record<string, unknown> = {
          target_audiences,
          updated_at: new Date().toISOString(),
        };

        if (strategyOutput.pillar_primary) {
          const pillars = [strategyOutput.pillar_primary];
          if (strategyOutput.pillar_secondary) pillars.push(strategyOutput.pillar_secondary);
          updatePayload.pillar_tags = pillars;
        }

        await supabase.from("campaigns").update(updatePayload).eq("id", campaignId);

        send("done", "Strategy generation complete", {
          audiences: Object.keys(strategyOutput.audience_narratives || {}),
          channels: Object.keys(strategyOutput.channel_strategy || {}),
          key_messages_count: (strategyOutput.key_messages || []).length,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        send("error", `Generation failed: ${message}`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
