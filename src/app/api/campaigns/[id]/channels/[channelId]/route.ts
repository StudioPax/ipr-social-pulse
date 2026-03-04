/**
 * @api PATCH /api/campaigns/[id]/channels/[channelId] — Update channel plan
 * @api DELETE /api/campaigns/[id]/channels/[channelId] — Remove channel plan
 * Module 7 — Content Campaigns
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; channelId: string } }
) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from("campaign_channels")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", params.channelId)
      .eq("campaign_id", params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ channel: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; channelId: string } }
) {
  try {
    const { error } = await supabase
      .from("campaign_channels")
      .delete()
      .eq("id", params.channelId)
      .eq("campaign_id", params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
