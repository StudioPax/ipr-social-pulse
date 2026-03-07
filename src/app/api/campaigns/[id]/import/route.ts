/**
 * @api POST /api/campaigns/[id]/import — Import campaign deliverables from JSON
 * Campaign Import Pipeline v1.0
 *
 * Validates JSON against CampaignImportSchema, optionally returns preview,
 * or commits deliverables to campaign_channels table.
 *
 * Query params:
 *   ?preview=true  → validate + return preview (don't save)
 *   ?preview=false → validate + commit to DB (default)
 *
 * Request body: { json: CampaignImportSchema }
 *
 * Response (preview):
 *   { valid: true, summary: {...}, deliverables: [...] }
 *   { valid: false, errors: [{field, message, deliverable_index}] }
 *
 * Response (commit):
 *   { success: true, deliverables_created: number }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import {
  validateImportJSON,
  toChannelInserts,
  type CampaignImportSchema,
} from "@/lib/campaign-import";

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
    const isPreview = request.nextUrl.searchParams.get("preview") === "true";

    // Parse request body
    const body = await request.json();
    const jsonData = body.json;

    if (!jsonData) {
      return NextResponse.json(
        { valid: false, errors: [{ field: "root", message: "Request body must include a 'json' field with the import data" }] },
        { status: 400 }
      );
    }

    // Fetch campaign to validate against
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, campaign_type, duration_weeks, title")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Validate the JSON against the schema + campaign constraints
    const validationResult = validateImportJSON(
      jsonData,
      campaign.campaign_type,
      campaign.duration_weeks
    );

    if (!validationResult.valid) {
      return NextResponse.json(
        { valid: false, errors: validationResult.errors },
        { status: 400 }
      );
    }

    // Valid JSON — build the insert rows
    const importData = jsonData as CampaignImportSchema;
    const insertRows = toChannelInserts(campaignId, importData);

    if (isPreview) {
      // Preview mode — return summary + deliverable preview without saving
      return NextResponse.json({
        valid: true,
        summary: validationResult.summary,
        deliverables: insertRows.map((row, i) => ({
          index: i,
          week_number: row.week_number,
          channel: row.channel,
          audience_segment: row.audience_segment,
          stage: row.stage,
          suggested_content_preview: row.suggested_content.slice(0, 120) + (row.suggested_content.length > 120 ? "..." : ""),
          char_limit: row.char_limit,
          status: row.status,
        })),
      });
    }

    // Commit mode — backup existing, delete, insert new, rollback on failure

    // 1. Backup existing deliverables before deletion
    const { data: existingChannels } = await supabase
      .from("campaign_channels")
      .select("*")
      .eq("campaign_id", campaignId);

    const backup = existingChannels || [];

    // 2. Delete existing deliverables
    const { error: deleteError } = await supabase
      .from("campaign_channels")
      .delete()
      .eq("campaign_id", campaignId);

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to clear existing deliverables: ${deleteError.message}` },
        { status: 500 }
      );
    }

    // 3. Insert new deliverables
    const { error: insertError } = await supabase
      .from("campaign_channels")
      .insert(insertRows);

    if (insertError) {
      // Rollback — restore backed-up deliverables
      if (backup.length > 0) {
        const restoreRows = backup.map((row) => ({
          campaign_id: row.campaign_id,
          channel: row.channel,
          audience_segment: row.audience_segment,
          suggested_content: row.suggested_content,
          char_limit: row.char_limit,
          hashtags: row.hashtags,
          mentions: row.mentions,
          media_suggestion: row.media_suggestion,
          status: row.status,
          stage: row.stage,
          week_number: row.week_number,
          scheduled_date: row.scheduled_date,
          published_post_id: row.published_post_id,
          publish_order: row.publish_order,
          narrative_angle: row.narrative_angle,
          call_to_action: row.call_to_action,
          key_message_ids: row.key_message_ids,
        }));
        await supabase.from("campaign_channels").insert(restoreRows);
      }
      return NextResponse.json(
        { error: `Failed to import deliverables (rolled back): ${insertError.message}` },
        { status: 500 }
      );
    }

    // 4. Save weekly_objectives — use explicit ones from JSON, or auto-generate from deliverables
    const weeklyObjectives = (() => {
      // If explicitly provided, use those
      if (importData.weekly_objectives && importData.weekly_objectives.length > 0) {
        return importData.weekly_objectives;
      }
      // Auto-generate from deliverables: group by week → build objective summary
      const weekMap = new Map<number, { stages: Set<string>; channels: Set<string>; count: number }>();
      for (const d of importData.deliverables) {
        if (!weekMap.has(d.week_number)) {
          weekMap.set(d.week_number, { stages: new Set(), channels: new Set(), count: 0 });
        }
        const w = weekMap.get(d.week_number)!;
        w.stages.add(d.stage.replace(/_/g, " "));
        w.channels.add(d.channel.replace(/_/g, " "));
        w.count++;
      }
      const stageLabels: Record<string, string> = {
        "pre launch": "build anticipation and prepare for launch",
        rollout: "launch across channels and drive initial engagement",
        sustain: "maintain momentum and deepen audience engagement",
        measure: "evaluate impact and close the campaign arc",
      };
      return Array.from(weekMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([weekNum, info]) => {
          const primaryStage = Array.from(info.stages)[0];
          const stageGoal = stageLabels[primaryStage] || primaryStage;
          const channelList = Array.from(info.channels).join(", ");
          return {
            week_number: weekNum,
            objective: `Week ${weekNum} objective: ${stageGoal}. ${info.count} deliverable${info.count !== 1 ? "s" : ""} across ${channelList}.`,
          };
        });
    })();

    if (weeklyObjectives.length > 0) {
      const { data: existingAnalysis } = await supabase
        .from("campaign_analyses")
        .select("id")
        .eq("campaign_id", campaignId)
        .single();

      const objectivesPayload = weeklyObjectives as unknown as Json;

      if (existingAnalysis) {
        await supabase
          .from("campaign_analyses")
          .update({ weekly_objectives: objectivesPayload })
          .eq("id", existingAnalysis.id);
      } else {
        await supabase
          .from("campaign_analyses")
          .insert({
            campaign_id: campaignId,
            weekly_objectives: objectivesPayload,
          });
      }
    }

    // 5. Update campaign channels_used from the import
    await supabase
      .from("campaigns")
      .update({
        channels_used: importData.channels_used,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    return NextResponse.json({
      success: true,
      deliverables_created: insertRows.length,
      deliverables_deleted: backup.length,
      summary: validationResult.summary,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
