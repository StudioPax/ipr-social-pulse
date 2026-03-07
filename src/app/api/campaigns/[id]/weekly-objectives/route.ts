/**
 * @api GET/PATCH /api/campaigns/[id]/weekly-objectives — Weekly Objectives
 * Fetch or update weekly objectives for a campaign's analysis.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET — fetch weekly_objectives from campaign_analyses
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: campaignId } = params;

  const { data, error } = await supabase
    .from("campaign_analyses")
    .select("weekly_objectives")
    .eq("campaign_id", campaignId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { weekly_objectives: [] },
      { status: 200 }
    );
  }

  return NextResponse.json({
    weekly_objectives: data.weekly_objectives || [],
  });
}

// PATCH — update a single week's objective text
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: campaignId } = params;
  const body = await request.json();
  const { week_number, objective } = body as {
    week_number: number;
    objective: string;
  };

  if (week_number == null || typeof objective !== "string") {
    return NextResponse.json(
      { error: "week_number and objective are required" },
      { status: 400 }
    );
  }

  // Fetch current objectives
  const { data: analysis, error: fetchErr } = await supabase
    .from("campaign_analyses")
    .select("id, weekly_objectives")
    .eq("campaign_id", campaignId)
    .single();

  if (fetchErr || !analysis) {
    return NextResponse.json(
      { error: "No analysis found for this campaign" },
      { status: 404 }
    );
  }

  // Update the specific week's objective
  const objectives = (
    Array.isArray(analysis.weekly_objectives) ? analysis.weekly_objectives : []
  ) as Array<{ week_number: number; objective: string }>;

  const idx = objectives.findIndex((o) => o.week_number === week_number);
  if (idx >= 0) {
    objectives[idx].objective = objective;
  } else {
    objectives.push({ week_number, objective });
    objectives.sort((a, b) => a.week_number - b.week_number);
  }

  const { error: updateErr } = await supabase
    .from("campaign_analyses")
    .update({ weekly_objectives: objectives as unknown as Json })
    .eq("id", analysis.id);

  if (updateErr) {
    return NextResponse.json(
      { error: `Failed to update: ${updateErr.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ weekly_objectives: objectives });
}
