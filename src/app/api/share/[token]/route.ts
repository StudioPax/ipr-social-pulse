/**
 * @api GET /api/share/[token] — Public endpoint: validate token, increment views, return campaign data
 * Returns Strategy + Campaign Plan data only (no raw AI analysis, no documents)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    // Look up share by token
    const { data: share, error: shareErr } = await supabase
      .from("campaign_shares")
      .select("*")
      .eq("share_token", token)
      .eq("status", "active")
      .single();

    if (shareErr || !share) {
      return NextResponse.json(
        { error: "This shared link is no longer available." },
        { status: 404 }
      );
    }

    // Check expiry
    if (new Date(share.expires_at) < new Date()) {
      await supabase
        .from("campaign_shares")
        .update({ status: "expired" })
        .eq("id", share.id);
      return NextResponse.json(
        { error: "This shared link has expired." },
        { status: 410 }
      );
    }

    // Increment view count + update last_viewed_at
    await supabase
      .from("campaign_shares")
      .update({
        view_count: share.view_count + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq("id", share.id);

    // Fetch campaign + analysis + channels (Strategy + Campaign Plan only)
    const [campaignRes, analysisRes, channelsRes] = await Promise.all([
      supabase
        .from("campaigns")
        .select("id, title, status, pillar_primary, pillar_secondary, campaign_type, channels_used, target_audiences, research_authors, research_url, research_doi, publication_date, start_date, duration_weeks, embargo_until")
        .eq("id", share.campaign_id)
        .single(),
      supabase
        .from("campaign_analyses")
        .select("research_summary, key_messages, fw_values_lead, fw_causal_chain, fw_solutions_framing, fw_thematic_bridge, fw_cultural_freight, audience_narratives, channel_strategy, key_findings, policy_implications, timing_recommendations")
        .eq("campaign_id", share.campaign_id)
        .single(),
      supabase
        .from("campaign_channels")
        .select("id, channel, audience_segment, stage, status, week_number, scheduled_date, suggested_content, narrative_angle, hashtags, mentions, call_to_action, media_suggestion, char_limit, key_message_ids, publish_order")
        .eq("campaign_id", share.campaign_id)
        .order("publish_order"),
    ]);

    if (campaignRes.error) {
      return NextResponse.json(
        { error: "Campaign data not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      campaign: campaignRes.data,
      analysis: analysisRes.data || null,
      channels: channelsRes.data || [],
      share: {
        created_at: share.created_at,
        expires_at: share.expires_at,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
