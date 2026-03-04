/**
 * @api PATCH /api/campaigns/[id]/analysis — Update campaign analysis fields
 * Module 7 — Content Campaigns
 *
 * Supports partial updates to audience_narratives and fw_* messaging guidance fields.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ALLOWED_FIELDS = new Set([
  "audience_narratives",
  "fw_values_lead",
  "fw_causal_chain",
  "fw_cultural_freight",
  "fw_thematic_bridge",
  "fw_solutions_framing",
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: campaignId } = params;
    const body = await request.json();

    // Filter to only allowed fields
    const updates: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if (ALLOWED_FIELDS.has(key)) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("campaign_analyses")
      .update(updates)
      .eq("campaign_id", campaignId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ analysis: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
