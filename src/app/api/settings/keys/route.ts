/**
 * @api /api/settings/keys — Manage AI model API keys
 * GET: Check which keys are configured (boolean flags, never actual values)
 * POST: Save/update an API key
 * PUT: Test an API key connection
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { testClaudeConnection } from "@/lib/claude";
import { testGeminiConnection } from "@/lib/gemini";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const VALID_SETTING_KEYS = [
  "anthropic_api_key",
  "gemini_api_key",
  "anthropic_model",
  "gemini_model",
] as const;
type SettingKey = (typeof VALID_SETTING_KEYS)[number];

/** GET — Check which keys are configured */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client_id");

  if (!clientId) {
    return NextResponse.json(
      { error: "client_id is required" },
      { status: 400 }
    );
  }

  const { data: settings } = await supabase
    .from("client_settings")
    .select("setting_key, setting_value")
    .eq("client_id", clientId)
    .in("setting_key", [...VALID_SETTING_KEYS]);

  const settingsMap = new Map(
    (settings || []).map((s) => [s.setting_key, s.setting_value])
  );

  return NextResponse.json({
    claude: {
      configured: settingsMap.has("anthropic_api_key"),
      model: settingsMap.get("anthropic_model") || "claude-sonnet-4-20250514",
    },
    gemini: {
      configured: settingsMap.has("gemini_api_key"),
      model: settingsMap.get("gemini_model") || "gemini-3-pro-preview",
    },
  });
}

/** POST — Save or update an API key */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { client_id, key_type, api_key } = body as {
      client_id: string;
      key_type: string;
      api_key: string;
    };

    if (!client_id || !key_type || !api_key) {
      return NextResponse.json(
        { error: "client_id, key_type, and api_key are required" },
        { status: 400 }
      );
    }

    if (!VALID_SETTING_KEYS.includes(key_type as SettingKey)) {
      return NextResponse.json(
        { error: `Invalid key_type. Must be one of: ${VALID_SETTING_KEYS.join(", ")}` },
        { status: 400 }
      );
    }

    // Upsert the key
    const { error } = await supabase.from("client_settings").upsert(
      {
        client_id,
        setting_key: key_type,
        setting_value: api_key,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id,setting_key" }
    );

    if (error) {
      return NextResponse.json(
        { error: `Failed to save key: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${key_type} saved successfully`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** PUT — Test an API key by making a minimal request */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { client_id, model } = body as {
      client_id: string;
      model: "claude" | "gemini";
    };

    if (!client_id || !model) {
      return NextResponse.json(
        { error: "client_id and model are required" },
        { status: 400 }
      );
    }

    // Look up the API key
    const settingKey = model === "claude" ? "anthropic_api_key" : "gemini_api_key";
    const { data: setting } = await supabase
      .from("client_settings")
      .select("setting_value")
      .eq("client_id", client_id)
      .eq("setting_key", settingKey)
      .single();

    if (!setting) {
      return NextResponse.json(
        { error: `No ${model} API key configured` },
        { status: 404 }
      );
    }

    // Test the connection
    const result =
      model === "claude"
        ? await testClaudeConnection(setting.setting_value)
        : await testGeminiConnection(setting.setting_value);

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message: msg, latencyMs: 0 },
      { status: 500 }
    );
  }
}
