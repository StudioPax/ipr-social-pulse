/**
 * @api GET  /api/campaigns/[id]/share — Get active share for campaign
 * @api POST /api/campaigns/[id]/share — Create share (revokes existing)
 * @api DELETE /api/campaigns/[id]/share — Revoke active share
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import type { Database } from "@/types/database";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SHARE_EXPIRY_DAYS = 180;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data, error } = await supabase
      .from("campaign_shares")
      .select("*")
      .eq("campaign_id", id)
      .eq("status", "active")
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows

    // Check if expired
    if (data && new Date(data.expires_at) < new Date()) {
      await supabase
        .from("campaign_shares")
        .update({ status: "expired" })
        .eq("id", data.id);
      return NextResponse.json({ share: null });
    }

    return NextResponse.json({ share: data || null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get campaign to verify it exists and get client_id
    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .select("id, client_id")
      .eq("id", id)
      .single();

    if (campErr || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Revoke any existing active share
    await supabase
      .from("campaign_shares")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("campaign_id", id)
      .eq("status", "active");

    // Create new share
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SHARE_EXPIRY_DAYS);

    const { data: share, error: shareErr } = await supabase
      .from("campaign_shares")
      .insert({
        campaign_id: id,
        client_id: campaign.client_id,
        share_token: nanoid(),
        status: "active",
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (shareErr) throw shareErr;

    return NextResponse.json({ share });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { error } = await supabase
      .from("campaign_shares")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("campaign_id", id)
      .eq("status", "active");

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
