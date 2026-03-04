/**
 * @api GET /api/campaigns/[id]/documents/[docId] — Get a document
 * @api PATCH /api/campaigns/[id]/documents/[docId] — Update a document
 * @api DELETE /api/campaigns/[id]/documents/[docId] — Delete a document
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
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const { data, error } = await supabase
      .from("campaign_documents")
      .select("*")
      .eq("id", params.docId)
      .eq("campaign_id", params.id)
      .single();

    if (error) throw error;

    return NextResponse.json({ document: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const body = await request.json();

    // Recalculate word count if content_text is being updated
    if (body.content_text !== undefined) {
      body.word_count = body.content_text ? countWords(body.content_text) : null;
    }

    const { data, error } = await supabase
      .from("campaign_documents")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", params.docId)
      .eq("campaign_id", params.id)
      .select()
      .single();

    if (error) throw error;

    // Update campaign's updated_at
    await supabase
      .from("campaigns")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", params.id);

    return NextResponse.json({ document: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const { error } = await supabase
      .from("campaign_documents")
      .delete()
      .eq("id", params.docId)
      .eq("campaign_id", params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
