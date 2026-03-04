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
import type { Database } from "@/types/database";
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

    // Commit mode — delete existing channel plans and insert new ones
    // First, delete existing deliverables for this campaign
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

    // Insert all new deliverables
    const { error: insertError } = await supabase
      .from("campaign_channels")
      .insert(insertRows);

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to import deliverables: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Update campaign channels_used from the import
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
      summary: validationResult.summary,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
