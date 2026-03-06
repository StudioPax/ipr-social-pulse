/**
 * @api POST /api/campaigns/[id]/generate-brief — Generate AI Brief (SSE stream)
 * Module 7 — Content Campaigns, Operation 1 (Optional)
 *
 * Reads the research_paper document, sends to LLM, saves result as ai_brief document.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  buildBriefUserMessage,
  type BriefOutput,
} from "@/lib/campaign-prompt";
import { loadPrompt } from "@/lib/prompt-loader";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface GenerateBriefRequest {
  client_id: string;
  model: "claude" | "gemini";
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: campaignId } = params;
  const body: GenerateBriefRequest = await request.json();
  const { client_id, model } = body;

  if (!client_id || !model) {
    return NextResponse.json(
      { error: "client_id and model are required" },
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

  // Look up saved model selection
  const modelSettingKey = model === "claude" ? "anthropic_model" : "gemini_model";
  const { data: modelSetting } = await supabase
    .from("client_settings")
    .select("setting_value")
    .eq("client_id", client_id)
    .eq("setting_key", modelSettingKey)
    .single();

  const selectedModel =
    modelSetting?.setting_value ||
    (model === "claude" ? "claude-sonnet-4-20250514" : "gemini-3-pro-preview");

  // Get campaign + research paper document
  const [campaignRes, docsRes] = await Promise.all([
    supabase.from("campaigns").select("*").eq("id", campaignId).single(),
    supabase
      .from("campaign_documents")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("document_role", "research_paper"),
  ]);

  if (campaignRes.error || !campaignRes.data) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const campaign = campaignRes.data;
  const papers = docsRes.data || [];

  if (papers.length === 0) {
    return NextResponse.json(
      { error: "No research paper document found. Add a research paper first." },
      { status: 400 }
    );
  }

  const paper = papers[0];

  if (!paper.content_text || paper.content_text.trim().length === 0) {
    return NextResponse.json(
      { error: "Research paper has no content text. Add the paper text first." },
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
        const prompt = await loadPrompt(client_id, "campaign-brief");
        send("info", `Generating AI Brief for "${campaign.title}"`);
        send("info", `Model: ${model} (${selectedModel}), prompt ${prompt.version} [${prompt.source}]`);
        send("info", `Research paper: "${paper.title}" — ${paper.word_count || "?"} words`);

        const userMessage = buildBriefUserMessage({
          title: paper.title,
          authors: campaign.research_authors || [],
          doi: campaign.research_doi || undefined,
          url: campaign.research_url || undefined,
          content_text: paper.content_text || "",
          publication_date: campaign.publication_date || undefined,
        });

        send("info", "Sending to AI...");
        const t0 = Date.now();

        let responseText: string;

        if (model === "claude") {
          const client = new Anthropic({ apiKey });
          const response = await client.messages.create({
            model: selectedModel,
            max_tokens: prompt.maxTokens,
            temperature: prompt.temperature,
            system: prompt.systemPrompt,
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
            model: selectedModel,
            systemInstruction: prompt.systemPrompt,
            generationConfig: { temperature: prompt.temperature, responseMimeType: "application/json" },
          });
          const result = await geminiModel.generateContent(userMessage);
          responseText = result.response.text();
        }

        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        send("success", `Response received in ${elapsed}s`);

        // Parse JSON
        let briefOutput: BriefOutput;
        try {
          const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          briefOutput = JSON.parse(cleaned);
        } catch {
          send("error", "Failed to parse AI response as JSON");
          send("error", `Raw response (first 500 chars): ${responseText.slice(0, 500)}`);
          controller.close();
          return;
        }

        send("info", "Parsed brief successfully");

        // Build brief text content
        const briefText = formatBriefAsText(briefOutput);
        const wordCount = briefText.split(/\s+/).filter(Boolean).length;

        // Check for existing ai_brief and delete it
        const { data: existingBriefs } = await supabase
          .from("campaign_documents")
          .select("id")
          .eq("campaign_id", campaignId)
          .eq("document_role", "ai_brief");

        if (existingBriefs && existingBriefs.length > 0) {
          for (const existing of existingBriefs) {
            await supabase.from("campaign_documents").delete().eq("id", existing.id);
          }
          send("info", "Replaced existing AI Brief");
        }

        // Save as campaign_documents row
        const { data: newDoc, error: docError } = await supabase
          .from("campaign_documents")
          .insert({
            campaign_id: campaignId,
            document_role: "ai_brief",
            title: `AI Brief — ${campaign.title}`,
            content_text: briefText,
            source: "ai_generated",
            word_count: wordCount,
            is_included: true,
            sort_order: 2, // After research_paper (0) and before supporting (3)
          })
          .select()
          .single();

        if (docError) {
          send("error", `Failed to save brief: ${docError.message}`);
        } else {
          send("success", `AI Brief saved — ${wordCount} words`, { document_id: newDoc?.id });
        }

        // Update campaign pillar_tags if the brief mapped them
        if (briefOutput.pillar_primary) {
          const pillars = [briefOutput.pillar_primary];
          if (briefOutput.pillar_secondary) pillars.push(briefOutput.pillar_secondary);
          await supabase
            .from("campaigns")
            .update({ pillar_tags: pillars, updated_at: new Date().toISOString() })
            .eq("id", campaignId);
          send("info", `Updated campaign pillars: ${pillars.join(", ")}`);
        }

        send("done", "AI Brief generation complete", {
          document_id: newDoc?.id,
          word_count: wordCount,
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

/** Format BriefOutput as readable text for the document viewer */
function formatBriefAsText(brief: BriefOutput): string {
  const sections: string[] = [];

  sections.push(`## Research Question\n${brief.research_question}`);
  sections.push(`## Methodology\n${brief.methodology}`);

  if (brief.key_findings?.length > 0) {
    sections.push(
      `## Key Findings\n${brief.key_findings
        .map((f, i) => `${i + 1}. ${f.finding}\n   Evidence: ${f.evidence}`)
        .join("\n")}`
    );
  }

  if (brief.caveats?.length > 0) {
    sections.push(
      `## Caveats & Limitations\n${brief.caveats.map((c) => `- ${c}`).join("\n")}`
    );
  }

  if (brief.policy_implications?.length > 0) {
    sections.push(
      `## Policy Implications\n${brief.policy_implications.map((p) => `- ${p}`).join("\n")}`
    );
  }

  sections.push(
    `## Pillar Mapping\nPrimary: ${brief.pillar_primary}${
      brief.pillar_secondary ? `\nSecondary: ${brief.pillar_secondary}` : ""
    }\nRationale: ${brief.pillar_rationale}`
  );

  if (brief.nu_alignment_tags?.length > 0) {
    sections.push(`## NU Alignment\n${brief.nu_alignment_tags.join(", ")}`);
  }

  if (brief.headline_angles?.length > 0) {
    sections.push(
      `## Headline Angles\n${brief.headline_angles.map((h, i) => `${i + 1}. ${h}`).join("\n")}`
    );
  }

  if (brief.confidence_note) {
    sections.push(`## Confidence Note\n${brief.confidence_note}`);
  }

  return sections.join("\n\n");
}
