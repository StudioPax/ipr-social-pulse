/**
 * @api /api/settings/models — List available AI models per vendor
 * GET: Returns available models for a vendor using the stored API key
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import Anthropic from "@anthropic-ai/sdk";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ModelInfo {
  id: string;
  name: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vendor = searchParams.get("vendor");
  const clientId = searchParams.get("client_id");

  if (!vendor || !clientId) {
    return NextResponse.json(
      { error: "vendor and client_id are required" },
      { status: 400 }
    );
  }

  if (vendor !== "claude" && vendor !== "gemini") {
    return NextResponse.json(
      { error: "vendor must be 'claude' or 'gemini'" },
      { status: 400 }
    );
  }

  // Look up the API key
  const settingKey =
    vendor === "claude" ? "anthropic_api_key" : "gemini_api_key";
  const { data: setting } = await supabase
    .from("client_settings")
    .select("setting_value")
    .eq("client_id", clientId)
    .eq("setting_key", settingKey)
    .single();

  if (!setting) {
    return NextResponse.json(
      { error: `No ${vendor} API key configured` },
      { status: 404 }
    );
  }

  try {
    const models =
      vendor === "claude"
        ? await listAnthropicModels(setting.setting_value)
        : await listGeminiModels(setting.setting_value);

    return NextResponse.json({ models });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to list models: ${msg}` },
      { status: 500 }
    );
  }
}

async function listAnthropicModels(apiKey: string): Promise<ModelInfo[]> {
  const client = new Anthropic({ apiKey });
  const response = await client.models.list({ limit: 100 });

  const models: ModelInfo[] = [];
  for (const m of response.data) {
    // Only include Claude models (skip legacy/test models)
    if (m.id.startsWith("claude-")) {
      models.push({
        id: m.id,
        name: m.display_name || m.id,
      });
    }
  }

  // Sort by name descending (newest first)
  models.sort((a, b) => b.id.localeCompare(a.id));
  return models;
}

interface GeminiModelResponse {
  models: Array<{
    name: string;
    displayName: string;
    supportedGenerationMethods: string[];
  }>;
}

async function listGeminiModels(apiKey: string): Promise<ModelInfo[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`
  );

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
  }

  const data: GeminiModelResponse = await res.json();
  const models: ModelInfo[] = [];

  for (const m of data.models || []) {
    // Only include models that support content generation
    if (m.supportedGenerationMethods?.includes("generateContent")) {
      // Strip "models/" prefix from the name
      const id = m.name.replace(/^models\//, "");
      models.push({
        id,
        name: m.displayName || id,
      });
    }
  }

  // Sort by name descending (newest first)
  models.sort((a, b) => b.id.localeCompare(a.id));
  return models;
}
