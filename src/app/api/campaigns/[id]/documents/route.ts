/**
 * @api GET /api/campaigns/[id]/documents — List documents for a campaign
 * @api POST /api/campaigns/[id]/documents — Add a document to a campaign
 * Module 7 — Content Campaigns
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from("campaign_documents")
      .select("*")
      .eq("campaign_id", params.id)
      .order("sort_order");

    if (error) throw error;

    return NextResponse.json({ documents: data || [] });
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
    const { document_role, title, content_text, file_url, file_name, file_type } = body;

    if (!document_role || !title) {
      return NextResponse.json({ error: "document_role and title required" }, { status: 400 });
    }

    // Calculate word count if content is provided
    const word_count = content_text ? countWords(content_text) : null;

    // Get max sort_order for this campaign
    const { data: existing } = await supabase
      .from("campaign_documents")
      .select("sort_order")
      .eq("campaign_id", params.id)
      .order("sort_order", { ascending: false })
      .limit(1);

    const sort_order = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

    const { data, error } = await supabase
      .from("campaign_documents")
      .insert({
        campaign_id: params.id,
        document_role,
        title,
        content_text: content_text || null,
        file_url: file_url || null,
        file_name: file_name || null,
        file_type: file_type || null,
        word_count,
        sort_order,
        source: "uploaded",
      })
      .select()
      .single();

    if (error) throw error;

    // Update campaign's updated_at
    await supabase
      .from("campaigns")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", params.id);

    return NextResponse.json({ document: data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
