/**
 * @api POST /api/campaigns/[id]/generate-prompt — Generate import prompt (SSE streaming)
 * Campaign Import Pipeline v1.0
 *
 * Reads campaign metadata, included documents, and strategy analysis,
 * then assembles a prompt string via template concatenation. No LLM call.
 * Streams verbose log events via SSE so the UI shows progress.
 *
 * Request body: { client_id: string } (required for consistency w/ other routes)
 * SSE events:
 *   data: { level: "info"|"success"|"warn"|"done"|"error", message: string, ...extras }
 *
 * Final "done" event includes: { prompt, version, stats }
 * Validation errors return JSON (not SSE) with 4xx status.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  buildImportPrompt,
  CAMPAIGN_IMPORT_PROMPT_VERSION,
  type ImportPromptDocument,
  type ImportPromptStrategy,
  type AudienceNarrative,
} from "@/lib/campaign-prompt";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: campaignId } = params;

  // ── Early validation (returns JSON errors, not SSE) ──────────────────

  // Fetch campaign, included documents, and strategy analysis in parallel
  const [campaignRes, docsRes, analysisRes] = await Promise.all([
    supabase.from("campaigns").select("*").eq("id", campaignId).single(),
    supabase
      .from("campaign_documents")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("is_included", true)
      .order("sort_order"),
    supabase
      .from("campaign_analyses")
      .select("*")
      .eq("campaign_id", campaignId)
      .single(),
  ]);

  if (campaignRes.error || !campaignRes.data) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const campaign = campaignRes.data;

  if (!campaign.campaign_type) {
    return NextResponse.json(
      { error: "Campaign type is required. Set it in campaign settings." },
      { status: 400 }
    );
  }

  if (!campaign.duration_weeks) {
    return NextResponse.json(
      { error: "Duration (weeks) is required. Set it in campaign settings." },
      { status: 400 }
    );
  }

  const docs = docsRes.data || [];
  if (docs.length === 0) {
    return NextResponse.json(
      { error: "No included documents found. Add and include at least one document." },
      { status: 400 }
    );
  }

  const analysis = analysisRes.data;

  // ── SSE stream (happy path) ──────────────────────────────────────────

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(level: string, message: string, data?: Record<string, unknown>) {
        const event = JSON.stringify({ level, message, ...data });
        controller.enqueue(encoder.encode(`data: ${event}\n\n`));
      }

      try {
        send("info", `Generating prompt for "${campaign.title}"`);
        send("info", `Type: ${campaign.campaign_type}, Duration: ${campaign.duration_weeks} weeks`);

        const targetAudiences = (campaign.target_audiences as string[]) || [];
        const channels = (campaign.channels_used as string[]) || [];

        if (channels.length > 0) {
          send("info", `Channels: ${channels.join(", ")}`);
        } else {
          send("warn", "No channels selected — prompt will use default channel mix");
        }

        if (targetAudiences.length > 0) {
          send("info", `Target audiences: ${targetAudiences.join(", ")}`);
        }

        // Documents
        send("info", `Loading ${docs.length} included document${docs.length !== 1 ? "s" : ""}...`);
        for (const doc of docs) {
          const wordCount = doc.content_text
            ? doc.content_text.split(/\s+/).length
            : 0;
          send("info", `  → [${doc.document_role}] "${doc.title}" (${wordCount.toLocaleString()} words)`);
        }

        const promptDocs: ImportPromptDocument[] = docs.map((d) => ({
          role: d.document_role,
          title: d.title,
          content_text: d.content_text || "",
        }));

        // Strategy
        let strategy: ImportPromptStrategy | null = null;
        if (analysis) {
          const audienceNarratives = (analysis.audience_narratives || {}) as unknown as Record<string, AudienceNarrative>;
          const audienceCount = Object.keys(audienceNarratives).length;
          const keyMessageCount = ((analysis.key_messages as string[]) || []).length;

          strategy = {
            key_messages: (analysis.key_messages as string[]) || [],
            audience_narratives: audienceNarratives,
            fw_values_lead: analysis.fw_values_lead || "",
            fw_causal_chain: analysis.fw_causal_chain || "",
            fw_cultural_freight: analysis.fw_cultural_freight || "",
            fw_thematic_bridge: analysis.fw_thematic_bridge || "",
            fw_solutions_framing: analysis.fw_solutions_framing || "",
          };

          send("success", `Strategy loaded — ${keyMessageCount} key messages, ${audienceCount} audience narratives`);

          const fwFields = [
            analysis.fw_values_lead,
            analysis.fw_causal_chain,
            analysis.fw_cultural_freight,
            analysis.fw_thematic_bridge,
            analysis.fw_solutions_framing,
          ].filter((f) => f && f.length > 0);
          send("info", `  → ${fwFields.length}/5 FrameWorks fields populated`);
        } else {
          send("warn", "No strategy analysis found — prompt will omit strategy anchor section");
        }

        // Assemble
        send("info", "Assembling prompt template...");

        const prompt = buildImportPrompt({
          title: campaign.title,
          campaign_type: campaign.campaign_type,
          duration_weeks: campaign.duration_weeks!,
          channels,
          target_audiences: targetAudiences,
          research_authors: (campaign.research_authors as string[]) || [],
          research_doi: campaign.research_doi || undefined,
          embargo_until: campaign.embargo_until || undefined,
          documents: promptDocs,
          strategy,
        });

        const totalWords = promptDocs.reduce(
          (sum, d) => sum + (d.content_text.split(/\s+/).length || 0),
          0
        );

        send("success", `Prompt assembled — ${prompt.length.toLocaleString()} characters`);
        send("info", `  → ${docs.length} documents, ~${totalWords.toLocaleString()} source words`);
        send("info", `  → Version: ${CAMPAIGN_IMPORT_PROMPT_VERSION}`);

        // Final done event
        send("done", "Prompt generation complete", {
          prompt,
          version: CAMPAIGN_IMPORT_PROMPT_VERSION,
          stats: {
            documents: docs.length,
            words: totalWords,
            has_strategy: !!analysis,
          },
        });

        controller.close();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        send("error", message);
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
