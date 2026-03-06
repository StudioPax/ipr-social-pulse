/**
 * @api /api/settings/prompts — Prompt template management
 * GET: List all prompts for a client, or get single prompt by slug
 * PUT: Update system_prompt, temperature, max_tokens for a prompt
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/** GET — list prompts or get single by slug */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("client_id");
    const slug = searchParams.get("slug");

    if (!clientId) {
      return NextResponse.json(
        { error: "client_id is required" },
        { status: 400 }
      );
    }

    if (slug) {
      // Single prompt by slug
      const { data, error } = await supabase
        .from("prompt_templates")
        .select("*")
        .eq("client_id", clientId)
        .eq("slug", slug)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: `Prompt not found: ${slug}` },
          { status: 404 }
        );
      }

      return NextResponse.json({ prompt: data });
    }

    // List all active prompts
    const { data, error } = await supabase
      .from("prompt_templates")
      .select("*")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .order("slug", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prompts: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** PUT — update a prompt's system_prompt, temperature, max_tokens */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { client_id, slug, system_prompt, temperature, max_tokens } = body;

    if (!client_id || !slug) {
      return NextResponse.json(
        { error: "client_id and slug are required" },
        { status: 400 }
      );
    }

    // Build the update object with only provided fields
    const updates: Record<string, unknown> = {};
    if (system_prompt !== undefined) updates.system_prompt = system_prompt;
    if (temperature !== undefined) updates.temperature = temperature;
    if (max_tokens !== undefined) updates.max_tokens = max_tokens;
    updates.updated_at = new Date().toISOString();

    if (Object.keys(updates).length === 1) {
      // Only updated_at — nothing to update
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("prompt_templates")
      .update(updates)
      .eq("client_id", client_id)
      .eq("slug", slug)
      .eq("is_active", true)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prompt: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
