// @api POST /api/collect/import — Import pre-collected posts from JSON
// Used for importing LinkedIn (or other platform) posts scraped externally.
// Creates a collection_run record and upserts posts, matching the standard collect flow.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ImportPost {
  platform: string;
  post_id: string;
  content_url?: string;
  published_at?: string;
  content_text?: string;
  content_format?: string;
  likes?: number;
  comments?: number;
  reposts?: number;
  shares?: number;
  engagement_total?: number;
  hashtags?: string[];
  mentions?: string[];
  links?: string[];
  media_urls?: string[];
  media_type?: string;
  authors?: string[];
  article_title?: string;
}

interface ImportRequest {
  client_id: string;
  platform: string;
  posts: ImportPost[];
}

export async function POST(request: NextRequest) {
  try {
    const body: ImportRequest = await request.json();
    const { client_id, platform, posts } = body;

    if (!client_id || !platform || !posts || posts.length === 0) {
      return NextResponse.json(
        { error: "client_id, platform, and posts[] are required" },
        { status: 400 }
      );
    }

    // 1. Create a collection_run record (same as /api/collect)
    const { data: run, error: runError } = await supabase
      .from("collection_runs")
      .insert({
        client_id,
        platforms: [platform],
        content_types: ["all"],
        min_engagement: 0,
        time_range_start: null,
        time_range_end: null,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (runError || !run) {
      return NextResponse.json(
        { error: "Failed to create collection run", details: runError?.message },
        { status: 500 }
      );
    }

    // 2. Map posts to DB rows
    const rows = posts.map((post) => ({
      client_id,
      collection_run_id: run.id,
      platform: post.platform || platform,
      post_id: post.post_id,
      content_text: post.content_text || null,
      content_url: post.content_url || null,
      published_at: post.published_at || null,
      content_format: post.content_format || null,
      likes: post.likes ?? 0,
      comments: post.comments ?? 0,
      reposts: post.reposts ?? 0,
      shares: post.shares ?? 0,
      engagement_total: post.engagement_total ?? (
        (post.likes ?? 0) + (post.comments ?? 0) + (post.reposts ?? 0) + (post.shares ?? 0)
      ),
      hashtags: post.hashtags || [],
      mentions: post.mentions || [],
      links: post.links || [],
      media_urls: post.media_urls || [],
      media_type: post.media_type || null,
      authors: post.authors || [],
    }));

    // 3. Upsert posts (deduplicate by client_id + platform + post_id)
    const { error: upsertError } = await supabase
      .from("posts")
      .upsert(rows, {
        onConflict: "client_id,platform,post_id",
        ignoreDuplicates: false,
      });

    if (upsertError) {
      // Mark run as failed
      await supabase
        .from("collection_runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: upsertError.message,
        })
        .eq("id", run.id);

      return NextResponse.json(
        { error: "Failed to insert posts", details: upsertError.message },
        { status: 500 }
      );
    }

    // 4. Mark run as completed
    await supabase
      .from("collection_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        posts_collected: posts.length,
      })
      .eq("id", run.id);

    return NextResponse.json({
      run_id: run.id,
      posts_imported: posts.length,
      platform,
      status: "completed",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
