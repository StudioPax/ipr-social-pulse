/**
 * @api GET /api/campaigns — List campaigns for a client
 * @api POST /api/campaigns — Create a new campaign
 * Module 7 — Content Campaigns
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const client_id = searchParams.get("client_id");

    if (!client_id) {
      return NextResponse.json({ error: "client_id required" }, { status: 400 });
    }

    // Get campaigns with document counts
    const { data: campaigns, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("client_id", client_id)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    // Get document counts and role summaries for each campaign
    const campaignIds = (campaigns || []).map((c) => c.id);

    const docSummaries: Record<string, { count: number; roles: string[]; hasNotes: boolean }> = {};
    const channelSummaries: Record<string, { total: number; published: number }> = {};

    if (campaignIds.length > 0) {
      const { data: docs } = await supabase
        .from("campaign_documents")
        .select("campaign_id, document_role")
        .in("campaign_id", campaignIds);

      if (docs) {
        for (const doc of docs) {
          if (!docSummaries[doc.campaign_id]) {
            docSummaries[doc.campaign_id] = { count: 0, roles: [], hasNotes: false };
          }
          docSummaries[doc.campaign_id].count++;
          if (!docSummaries[doc.campaign_id].roles.includes(doc.document_role)) {
            docSummaries[doc.campaign_id].roles.push(doc.document_role);
          }
          if (doc.document_role === "research_notes") {
            docSummaries[doc.campaign_id].hasNotes = true;
          }
        }
      }

      const { data: channels } = await supabase
        .from("campaign_channels")
        .select("campaign_id, status")
        .in("campaign_id", campaignIds);

      if (channels) {
        for (const ch of channels) {
          if (!channelSummaries[ch.campaign_id]) {
            channelSummaries[ch.campaign_id] = { total: 0, published: 0 };
          }
          channelSummaries[ch.campaign_id].total++;
          if (ch.status === "published") {
            channelSummaries[ch.campaign_id].published++;
          }
        }
      }
    }

    const enriched = (campaigns || []).map((c) => ({
      ...c,
      doc_summary: docSummaries[c.id] || { count: 0, roles: [], hasNotes: false },
      channel_summary: channelSummaries[c.id] || { total: 0, published: 0 },
    }));

    return NextResponse.json({ campaigns: enriched });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      client_id, title, research_authors, research_doi, research_url,
      publication_date, embargo_until, target_audiences, created_by,
      campaign_type, duration_weeks, channels_used,
    } = body;

    if (!client_id || !title) {
      return NextResponse.json({ error: "client_id and title required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        client_id,
        title,
        campaign_type: campaign_type || "new_research",
        duration_weeks: duration_weeks || null,
        channels_used: channels_used || [],
        research_authors: research_authors || [],
        research_doi: research_doi || null,
        research_url: research_url || null,
        publication_date: publication_date || null,
        embargo_until: embargo_until || null,
        target_audiences: target_audiences || [],
        created_by: created_by || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ campaign: data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("duplicate key")) {
      return NextResponse.json({ error: "A campaign with this title already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
