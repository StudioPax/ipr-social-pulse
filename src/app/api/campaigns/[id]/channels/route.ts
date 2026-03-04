/**
 * @api GET /api/campaigns/[id]/channels — List channel plans
 * @api POST /api/campaigns/[id]/channels — Add a channel plan
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
    const { data, error } = await supabase
      .from("campaign_channels")
      .select("*")
      .eq("campaign_id", params.id)
      .order("publish_order");

    if (error) throw error;

    return NextResponse.json({ channels: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { channel, audience_segment, ...rest } = body;

    if (!channel || !audience_segment) {
      return NextResponse.json({ error: "channel and audience_segment required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("campaign_channels")
      .insert({
        campaign_id: params.id,
        channel,
        audience_segment,
        ...rest,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ channel: data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
