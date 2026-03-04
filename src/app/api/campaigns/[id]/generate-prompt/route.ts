/**
 * @api POST /api/campaigns/[id]/generate-prompt — Generate import prompt (mechanical)
 * Campaign Import Pipeline v1.0
 *
 * Reads campaign metadata, included documents, and strategy analysis,
 * then assembles a prompt string via template concatenation. No LLM call.
 *
 * Request body: (none required — reads all data from DB)
 * Response: { prompt: string, version: string, stats: { documents: number, words: number, has_strategy: boolean } }
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
  try {
    const { id: campaignId } = params;

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

    // Validate required fields for prompt generation
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

    // Build document list for prompt
    const promptDocs: ImportPromptDocument[] = docs.map((d) => ({
      role: d.document_role,
      title: d.title,
      content_text: d.content_text || "",
    }));

    // Build strategy curated subset (if analysis exists)
    let strategy: ImportPromptStrategy | null = null;
    const analysis = analysisRes.data;
    if (analysis) {
      // audience_narratives is stored as Json — cast it
      const audienceNarratives = (analysis.audience_narratives || {}) as unknown as Record<string, AudienceNarrative>;

      strategy = {
        key_messages: (analysis.key_messages as string[]) || [],
        audience_narratives: audienceNarratives,
        fw_values_lead: analysis.fw_values_lead || "",
        fw_causal_chain: analysis.fw_causal_chain || "",
        fw_cultural_freight: analysis.fw_cultural_freight || "",
        fw_thematic_bridge: analysis.fw_thematic_bridge || "",
        fw_solutions_framing: analysis.fw_solutions_framing || "",
      };
    }

    // Target audiences and channels from campaign
    const targetAudiences = (campaign.target_audiences as string[]) || [];
    const channels = (campaign.channels_used as string[]) || [];

    // Assemble the prompt
    const prompt = buildImportPrompt({
      title: campaign.title,
      campaign_type: campaign.campaign_type,
      duration_weeks: campaign.duration_weeks,
      channels,
      target_audiences: targetAudiences,
      research_authors: (campaign.research_authors as string[]) || [],
      research_doi: campaign.research_doi || undefined,
      embargo_until: campaign.embargo_until || undefined,
      documents: promptDocs,
      strategy,
    });

    // Compute stats for the response
    const totalWords = promptDocs.reduce(
      (sum, d) => sum + (d.content_text.split(/\s+/).length || 0),
      0
    );

    return NextResponse.json({
      prompt,
      version: CAMPAIGN_IMPORT_PROMPT_VERSION,
      stats: {
        documents: docs.length,
        words: totalWords,
        has_strategy: !!analysis,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
