/**
 * @api /api/settings/prompts — Prompt template management
 * GET: List all prompts, get single by slug, or get version history
 * PUT: Save prompt changes as a new version (auto-increments version)
 * POST: Restore a previous version (creates a new version from historical content)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/** Increment minor version: "v1.4" → "v1.5", "brief-v1.0" → "brief-v1.1" */
function incrementVersion(version: string): string {
  const match = version.match(/^(.*v)(\d+)\.(\d+)$/);
  if (match) {
    const [, prefix, major, minor] = match;
    return `${prefix}${major}.${parseInt(minor) + 1}`;
  }
  return `${version}.1`;
}

/** GET — list prompts, get single by slug, or get version history */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("client_id");
    const slug = searchParams.get("slug");
    const history = searchParams.get("history");

    if (!clientId) {
      return NextResponse.json(
        { error: "client_id is required" },
        { status: 400 }
      );
    }

    if (slug) {
      // Version history: return all versions for this slug
      if (history === "true") {
        const { data, error } = await supabase
          .from("prompt_templates")
          .select("id, version, is_active, created_at, updated_at, system_prompt, temperature, max_tokens")
          .eq("client_id", clientId)
          .eq("slug", slug)
          .order("created_at", { ascending: false });

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ versions: data || [] });
      }

      // Single active prompt by slug
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

/** PUT — save prompt changes as a new version */
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

    // 1. Fetch current active row
    const { data: current, error: fetchError } = await supabase
      .from("prompt_templates")
      .select("*")
      .eq("client_id", client_id)
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (fetchError || !current) {
      return NextResponse.json(
        { error: "Active prompt not found" },
        { status: 404 }
      );
    }

    // Resolve new values (use provided or keep existing)
    const newSystemPrompt = system_prompt ?? current.system_prompt;
    const newTemp = temperature ?? current.temperature;
    const newTokens = max_tokens ?? current.max_tokens;

    // Check if anything actually changed
    if (
      newSystemPrompt === current.system_prompt &&
      newTemp === current.temperature &&
      newTokens === current.max_tokens
    ) {
      return NextResponse.json(
        { error: "No changes detected" },
        { status: 400 }
      );
    }

    // 2. Compute next version
    const nextVersion = incrementVersion(current.version);

    // 3. Deactivate old row
    const { error: deactivateError } = await supabase
      .from("prompt_templates")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", current.id);

    if (deactivateError) {
      return NextResponse.json(
        { error: deactivateError.message },
        { status: 500 }
      );
    }

    // 4. Insert new versioned row
    const now = new Date().toISOString();
    const { data: newRow, error: insertError } = await supabase
      .from("prompt_templates")
      .insert({
        client_id: current.client_id,
        slug: current.slug,
        name: current.name,
        description: current.description,
        version: nextVersion,
        system_prompt: newSystemPrompt,
        user_message_template: current.user_message_template,
        temperature: newTemp,
        max_tokens: newTokens,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (insertError) {
      // Rollback: reactivate old row
      await supabase
        .from("prompt_templates")
        .update({ is_active: true })
        .eq("id", current.id);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ prompt: newRow });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST — restore a previous version (creates a new version with historical content) */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { client_id, slug, restore_version_id } = body;

    if (!client_id || !slug || !restore_version_id) {
      return NextResponse.json(
        { error: "client_id, slug, and restore_version_id are required" },
        { status: 400 }
      );
    }

    // 1. Fetch the version to restore
    const { data: source, error: sourceError } = await supabase
      .from("prompt_templates")
      .select("*")
      .eq("id", restore_version_id)
      .eq("client_id", client_id)
      .eq("slug", slug)
      .single();

    if (sourceError || !source) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      );
    }

    // 2. Fetch current active row
    const { data: current, error: currentError } = await supabase
      .from("prompt_templates")
      .select("id, version")
      .eq("client_id", client_id)
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (currentError || !current) {
      return NextResponse.json(
        { error: "No active version found" },
        { status: 404 }
      );
    }

    // 3. Compute next version from current active
    const nextVersion = incrementVersion(current.version);

    // 4. Deactivate current active row
    const { error: deactivateError } = await supabase
      .from("prompt_templates")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", current.id);

    if (deactivateError) {
      return NextResponse.json(
        { error: deactivateError.message },
        { status: 500 }
      );
    }

    // 5. Insert new row with source content + new version
    const now = new Date().toISOString();
    const { data: restored, error: insertError } = await supabase
      .from("prompt_templates")
      .insert({
        client_id: source.client_id,
        slug: source.slug,
        name: source.name,
        description: source.description,
        version: nextVersion,
        system_prompt: source.system_prompt,
        user_message_template: source.user_message_template,
        temperature: source.temperature,
        max_tokens: source.max_tokens,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (insertError) {
      // Rollback: reactivate old row
      await supabase
        .from("prompt_templates")
        .update({ is_active: true })
        .eq("id", current.id);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ prompt: restored });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
