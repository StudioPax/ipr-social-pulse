/**
 * @api GET /api/campaigns/[id] — Get campaign with documents, channels, analysis
 * @api PATCH /api/campaigns/[id] — Update campaign fields
 * @api DELETE /api/campaigns/[id] — Archive campaign (soft delete)
 * Module 7 — Content Campaigns
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const [campaignRes, docsRes, channelsRes, analysisRes] = await Promise.all([
      supabase.from("campaigns").select("*").eq("id", id).single(),
      supabase.from("campaign_documents").select("*").eq("campaign_id", id).order("sort_order"),
      supabase.from("campaign_channels").select("*").eq("campaign_id", id).order("publish_order"),
      supabase.from("campaign_analyses").select("*").eq("campaign_id", id).single(),
    ]);

    if (campaignRes.error) throw campaignRes.error;

    return NextResponse.json({
      campaign: campaignRes.data,
      documents: docsRes.data || [],
      channels: channelsRes.data || [],
      analysis: analysisRes.data || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const { data, error } = await supabase
      .from("campaigns")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ campaign: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data, error } = await supabase
      .from("campaigns")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ campaign: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
