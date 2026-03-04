/**
 * @api /api/analyze — Run AI analysis on collected posts
 * App Spec Module 3 — LLM Analysis Engine
 *
 * GET: Pre-scan summary, progress polling, run history
 * POST: Trigger an analysis run
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { analyzeWithClaude } from "@/lib/claude";
import { analyzeWithGemini } from "@/lib/gemini";
import type { PostForAnalysis } from "@/lib/analysis-prompt";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BATCH_SIZE = 10;

interface AnalyzeRequest {
  client_id: string;
  run_type: "new_only" | "new_and_stale" | "full";
  model: "claude" | "gemini";
}

/** GET — Pre-scan, progress, or history */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client_id");
  const action = searchParams.get("action");

  if (!clientId) {
    return NextResponse.json(
      { error: "client_id is required" },
      { status: 400 }
    );
  }

  if (action === "prescan") {
    return handlePrescan(clientId);
  }

  if (action === "progress") {
    const runId = searchParams.get("run_id");
    if (!runId) {
      return NextResponse.json(
        { error: "run_id is required for progress" },
        { status: 400 }
      );
    }
    return handleProgress(runId);
  }

  // Default: return run history
  return handleHistory(clientId);
}

/** POST — Trigger analysis run (streams SSE log events) */
export async function POST(request: NextRequest) {
  const body: AnalyzeRequest = await request.json();
  const { client_id, run_type, model } = body;

  if (!client_id || !run_type || !model) {
    return NextResponse.json(
      { error: "client_id, run_type, and model are required" },
      { status: 400 }
    );
  }

  // Look up the API key
  const settingKey =
    model === "claude" ? "anthropic_api_key" : "gemini_api_key";
  const { data: setting } = await supabase
    .from("client_settings")
    .select("setting_value")
    .eq("client_id", client_id)
    .eq("setting_key", settingKey)
    .single();

  if (!setting) {
    return NextResponse.json(
      { error: `No ${model} API key configured. Add it in Settings.` },
      { status: 400 }
    );
  }

  const apiKey = setting.setting_value;

  // Get posts that need analysis
  const postsToAnalyze = await getPostsForAnalysis(client_id, run_type);

  if (postsToAnalyze.length === 0) {
    return NextResponse.json({
      status: "completed",
      message: "No posts need analysis",
      posts_queued: 0,
      posts_analyzed: 0,
      posts_skipped: 0,
    });
  }

  // Create analysis run record
  const modelVersion = model === "claude" ? "claude-sonnet-4" : "gemini-3-pro-preview";
  const { data: run, error: runError } = await supabase
    .from("analysis_runs")
    .insert({
      client_id,
      run_type,
      status: "running",
      posts_queued: postsToAnalyze.length,
      posts_analyzed: 0,
      posts_skipped: 0,
      model_version: modelVersion,
      prompt_version: "v1.0",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (runError || !run) {
    return NextResponse.json(
      { error: "Failed to create analysis run", details: runError?.message },
      { status: 500 }
    );
  }

  // Stream SSE response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(level: string, message: string, data?: Record<string, unknown>) {
        const event = JSON.stringify({ level, message, ...data });
        controller.enqueue(encoder.encode(`data: ${event}\n\n`));
      }

      const batches = chunkArray(postsToAnalyze, BATCH_SIZE);
      let totalAnalyzed = 0;
      let totalSkipped = 0;
      const errors: string[] = [];

      send("info", `Run started: ${postsToAnalyze.length} posts queued across ${batches.length} batch(es)`, {
        run_id: run.id,
        posts_queued: postsToAnalyze.length,
        batch_count: batches.length,
      });
      send("info", `Model: ${model} (${modelVersion}), prompt v1.0, batch size ${BATCH_SIZE}`);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchLabel = `Batch ${i + 1}/${batches.length}`;
        const postIds = batch.map((p) => p.id.slice(0, 8)).join(", ");

        send("info", `${batchLabel}: Preparing ${batch.length} posts [${postIds}...]`);
        send("info", `${batchLabel}: Sending to ${model} API...`);

        const t0 = Date.now();

        try {
          const analysisResult =
            model === "claude"
              ? await analyzeWithClaude(apiKey, batch)
              : await analyzeWithGemini(apiKey, batch);

          const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
          send("success", `${batchLabel}: Response received in ${elapsed}s — ${analysisResult.results.length} result(s) parsed`);

          // Upsert analysis results
          let batchSaved = 0;
          let batchSkipped = 0;

          for (const result of analysisResult.results) {
            const matchedPost = batch.find((p) => p.id === result.post_id);
            if (!matchedPost) {
              batchSkipped++;
              totalSkipped++;
              send("warn", `${batchLabel}: Post ${result.post_id.slice(0, 8)} — no matching post found, skipping`);
              continue;
            }

            const { error: insertError } = await supabase
              .from("post_analyses")
              .upsert(
                {
                  post_id: result.post_id,
                  analysis_run_id: run.id,
                  analyzed_at: new Date().toISOString(),
                  pillar_primary: result.pillar_primary,
                  pillar_secondary: result.pillar_secondary,
                  pillar_confidence: result.pillar_confidence,
                  pillar_rationale: result.pillar_rationale,
                  sentiment_label: result.sentiment_label,
                  sentiment_score: result.sentiment_score,
                  sentiment_confidence: result.sentiment_confidence,
                  content_type: result.content_type,
                  audience_fit: result.audience_fit,
                  policy_relevance: result.policy_relevance,
                  performance_tier: result.performance_tier,
                  recommended_action: result.recommended_action,
                  nu_alignment_tags: result.nu_alignment_tags,
                  research_title: result.research_title,
                  research_url: result.research_url,
                  research_authors: result.research_authors,
                  research_confidence: result.research_confidence,
                  sentiment_rationale: result.sentiment_rationale,
                  policy_relevance_rationale: result.policy_relevance_rationale,
                  tier_rationale: result.tier_rationale,
                  key_topics: result.key_topics,
                  summary: result.summary,
                  fw_values_lead_score: result.fw_values_lead_score,
                  fw_values_lead_eval: result.fw_values_lead_eval,
                  fw_causal_chain_score: result.fw_causal_chain_score,
                  fw_causal_chain_eval: result.fw_causal_chain_eval,
                  fw_cultural_freight_score: result.fw_cultural_freight_score,
                  fw_cultural_freight_eval: result.fw_cultural_freight_eval,
                  fw_episodic_thematic_score: result.fw_episodic_thematic_score,
                  fw_episodic_thematic_eval: result.fw_episodic_thematic_eval,
                  fw_solutions_framing_score: result.fw_solutions_framing_score,
                  fw_solutions_framing_eval: result.fw_solutions_framing_eval,
                  fw_overall_score: result.fw_overall_score,
                  fw_rewrite_rec: result.fw_rewrite_rec,
                  llm_response_raw: analysisResult.raw as Database["public"]["Tables"]["post_analyses"]["Row"]["llm_response_raw"],
                  model_version: analysisResult.model,
                  prompt_version: analysisResult.promptVersion,
                },
                { onConflict: "post_id" }
              );

            if (insertError) {
              const errMsg = `Failed to save post ${result.post_id.slice(0, 8)}: ${insertError.message}`;
              errors.push(errMsg);
              totalSkipped++;
              batchSkipped++;
              send("error", `${batchLabel}: ${errMsg}`);
              continue;
            }

            await supabase
              .from("posts")
              .update({ pillar_tag: result.pillar_primary })
              .eq("id", result.post_id);

            totalAnalyzed++;
            batchSaved++;
          }

          send("info", `${batchLabel}: DB save complete — ${batchSaved} saved, ${batchSkipped} skipped`);

          // Update progress on the run record
          await supabase
            .from("analysis_runs")
            .update({
              posts_analyzed: totalAnalyzed,
              posts_skipped: totalSkipped,
            })
            .eq("id", run.id);

          send("info", `Progress: ${totalAnalyzed}/${postsToAnalyze.length} analyzed`, {
            analyzed: totalAnalyzed,
            queued: postsToAnalyze.length,
          });
        } catch (err) {
          const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${batchLabel}: ${msg}`);
          totalSkipped += batch.length;

          send("error", `${batchLabel}: API call failed after ${elapsed}s — ${msg}`);

          // If first batch fails with auth error, abort
          if (i === 0 && msg.includes("auth")) {
            await supabase
              .from("analysis_runs")
              .update({
                status: "failed",
                error_message: msg,
                completed_at: new Date().toISOString(),
              })
              .eq("id", run.id);
            send("error", `Aborting: authentication error on first batch`);
            send("done", "Analysis failed", { status: "failed", run_id: run.id });
            controller.close();
            return;
          }
        }

        // Rate limit delay between batches
        if (i < batches.length - 1) {
          send("info", `Waiting 500ms before next batch (rate limit)...`);
          await sleep(500);
        }
      }

      // Finalize run
      const finalStatus =
        totalAnalyzed === 0 && errors.length > 0 ? "failed" : "completed";
      await supabase
        .from("analysis_runs")
        .update({
          status: finalStatus,
          posts_analyzed: totalAnalyzed,
          posts_skipped: totalSkipped,
          error_message: errors.length > 0 ? errors.join("; ") : null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      if (finalStatus === "completed") {
        send("success", `Analysis complete: ${totalAnalyzed} analyzed, ${totalSkipped} skipped`);
      } else {
        send("error", `Analysis failed: ${errors.length} error(s)`);
      }

      send("done", "Stream ended", {
        status: finalStatus,
        run_id: run.id,
        posts_analyzed: totalAnalyzed,
        posts_skipped: totalSkipped,
        posts_queued: postsToAnalyze.length,
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// --- Helper functions ---

/** Pre-scan: classify posts as current, stale, or new */
async function handlePrescan(clientId: string) {
  // Get all posts with their latest analysis
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, engagement_total")
    .eq("client_id", clientId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({
      current: 0,
      stale: 0,
      new: 0,
      total: 0,
    });
  }

  // Get all analyses
  const postIds = posts.map((p) => p.id);
  const { data: analyses } = await supabase
    .from("post_analyses")
    .select("post_id, analyzed_at")
    .in("post_id", postIds);

  const analysisMap = new Map(
    (analyses || []).map((a) => [a.post_id, a.analyzed_at])
  );

  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

  let current = 0;
  let stale = 0;
  let newCount = 0;

  for (const post of posts) {
    const analyzedAt = analysisMap.get(post.id);
    if (!analyzedAt) {
      newCount++;
    } else {
      const age = now - new Date(analyzedAt).getTime();
      if (age < THIRTY_DAYS) {
        current++;
      } else if (age < NINETY_DAYS) {
        // Between 30-90 days — could check engagement delta here
        // For now, mark as stale if over 30 days
        stale++;
      } else {
        stale++;
      }
    }
  }

  return NextResponse.json({
    current,
    stale,
    new: newCount,
    total: posts.length,
  });
}

/** Get progress of a running analysis */
async function handleProgress(runId: string) {
  const { data: run, error } = await supabase
    .from("analysis_runs")
    .select("*")
    .eq("id", runId)
    .single();

  if (error || !run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: run.status,
    posts_queued: run.posts_queued,
    posts_analyzed: run.posts_analyzed,
    posts_skipped: run.posts_skipped,
    error_message: run.error_message,
    started_at: run.started_at,
    completed_at: run.completed_at,
    model_version: run.model_version,
  });
}

/** Get recent analysis run history */
async function handleHistory(clientId: string) {
  const { data: runs, error } = await supabase
    .from("analysis_runs")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ runs });
}

/** Get posts that need analysis based on run_type */
async function getPostsForAnalysis(
  clientId: string,
  runType: string
): Promise<PostForAnalysis[]> {
  // Get all posts
  const { data: posts } = await supabase
    .from("posts")
    .select(
      "id, content_text, platform, published_at, engagement_total, hashtags, content_url"
    )
    .eq("client_id", clientId)
    .order("published_at", { ascending: false });

  if (!posts || posts.length === 0) return [];

  if (runType === "full") {
    return posts.map(toPostForAnalysis);
  }

  // Get existing analyses
  const postIds = posts.map((p) => p.id);
  const { data: analyses } = await supabase
    .from("post_analyses")
    .select("post_id, analyzed_at")
    .in("post_id", postIds);

  const analysisMap = new Map(
    (analyses || []).map((a) => [a.post_id, a.analyzed_at])
  );

  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  return posts.filter((post) => {
    const analyzedAt = analysisMap.get(post.id);
    if (!analyzedAt) return true; // New post — always include
    if (runType === "new_only") return false; // Only new posts
    // new_and_stale: include if analysis is older than 30 days
    const age = now - new Date(analyzedAt).getTime();
    return age >= THIRTY_DAYS;
  }).map(toPostForAnalysis);
}

function toPostForAnalysis(post: {
  id: string;
  content_text: string | null;
  platform: string;
  published_at: string | null;
  engagement_total: number | null;
  hashtags: string[] | null;
  content_url: string | null;
}): PostForAnalysis {
  return {
    id: post.id,
    content_text: post.content_text || "",
    platform: post.platform,
    published_at: post.published_at || "",
    engagement_total: post.engagement_total || 0,
    hashtags: post.hashtags || [],
    content_url: post.content_url,
  };
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
