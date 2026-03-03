/**
 * @api POST /api/collect — Run a collection job
 * App Spec Module 1 — Social Media Auditor
 *
 * Accepts collection parameters, queries social media APIs,
 * and stores normalized posts in Supabase.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  searchBlueskyPosts,
  getAuthorFeed,
  normalizePost,
} from "@/lib/bluesky";

// Server-side Supabase client (uses service role or anon key)
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CollectRequest {
  client_id: string;
  platforms: string[];
  time_range_start?: string;
  time_range_end?: string;
  content_types?: string[];
  min_engagement?: number;
  search_query?: string;
  collect_mode?: "search" | "feed"; // search = keyword search, feed = author feed
}

export async function POST(request: NextRequest) {
  try {
    const body: CollectRequest = await request.json();
    const {
      client_id,
      platforms,
      time_range_start,
      time_range_end,
      content_types = ["all"],
      min_engagement = 0,
      search_query,
      collect_mode = "feed",
    } = body;

    if (!client_id || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: "client_id and platforms are required" },
        { status: 400 }
      );
    }

    // Create a collection run record
    const { data: run, error: runError } = await supabase
      .from("collection_runs")
      .insert({
        client_id,
        platforms,
        content_types,
        min_engagement,
        time_range_start: time_range_start || null,
        time_range_end: time_range_end || null,
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

    let totalCollected = 0;
    const errors: string[] = [];

    // Process each platform
    for (const platform of platforms) {
      try {
        if (platform === "bluesky") {
          const posts = await collectBluesky({
            client_id,
            collection_run_id: run.id,
            time_range_start,
            time_range_end,
            min_engagement,
            search_query,
            collect_mode,
          });
          totalCollected += posts;
        } else {
          // Other platforms not yet implemented
          errors.push(`${platform}: connector not yet implemented`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${platform}: ${msg}`);
      }
    }

    // Update the collection run with results
    const { error: updateError } = await supabase
      .from("collection_runs")
      .update({
        status: errors.length > 0 && totalCollected === 0 ? "failed" : "completed",
        completed_at: new Date().toISOString(),
        posts_collected: totalCollected,
        error_message: errors.length > 0 ? errors.join("; ") : null,
      })
      .eq("id", run.id);

    if (updateError) {
      console.error("Failed to update collection run:", updateError);
    }

    return NextResponse.json({
      run_id: run.id,
      posts_collected: totalCollected,
      errors: errors.length > 0 ? errors : undefined,
      status: errors.length > 0 && totalCollected === 0 ? "failed" : "completed",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Collect posts from Bluesky */
async function collectBluesky(params: {
  client_id: string;
  collection_run_id: string;
  time_range_start?: string;
  time_range_end?: string;
  min_engagement: number;
  search_query?: string;
  collect_mode: "search" | "feed";
}): Promise<number> {
  let rawPosts: Array<import("@/lib/bluesky").BskyPost> = [];

  if (params.collect_mode === "search" && params.search_query) {
    // Search mode: search by keyword
    const result = await searchBlueskyPosts({
      query: params.search_query,
      limit: 50,
      since: params.time_range_start,
      until: params.time_range_end,
      sort: "latest",
    });
    rawPosts = result.posts;
  } else {
    // Feed mode: get posts from the configured Bluesky account
    const { data: account } = await supabase
      .from("social_accounts")
      .select("account_id, handle")
      .eq("client_id", params.client_id)
      .eq("platform", "bluesky")
      .single();

    if (!account) {
      throw new Error("No Bluesky account configured for this client");
    }

    const actor = account.handle || account.account_id;
    const result = await getAuthorFeed({
      actor,
      limit: 50,
      filter: "posts_no_replies",
    });
    rawPosts = result.feed.map((item) => item.post);
  }

  // Normalize and filter
  const normalized = rawPosts
    .map(normalizePost)
    .filter((post) => {
      // Filter by time range
      if (params.time_range_start) {
        const postDate = new Date(post.published_at);
        const startDate = new Date(params.time_range_start);
        if (postDate < startDate) return false;
      }
      if (params.time_range_end) {
        const postDate = new Date(post.published_at);
        const endDate = new Date(params.time_range_end);
        if (postDate > endDate) return false;
      }
      // Filter by minimum engagement
      if (post.engagement_total < params.min_engagement) return false;
      return true;
    });

  if (normalized.length === 0) return 0;

  // Upsert posts into the database (deduplicate by client_id + platform + post_id)
  const rows = normalized.map((post) => ({
    client_id: params.client_id,
    collection_run_id: params.collection_run_id,
    platform: post.platform,
    post_id: post.post_id,
    content_text: post.content_text,
    content_url: post.content_url,
    published_at: post.published_at,
    likes: post.likes,
    reposts: post.reposts,
    comments: post.comments,
    engagement_total: post.engagement_total,
    hashtags: post.hashtags,
    mentions: post.mentions,
    links: post.links,
    media_urls: post.media_urls,
    media_type: post.media_type,
    content_format: post.content_format,
    authors: post.authors,
  }));

  const { error } = await supabase
    .from("posts")
    .upsert(rows, {
      onConflict: "client_id,platform,post_id",
      ignoreDuplicates: false,
    });

  if (error) {
    throw new Error(`Failed to insert posts: ${error.message}`);
  }

  return normalized.length;
}

/** GET — Return recent collection runs for a client */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client_id");

  if (!clientId) {
    return NextResponse.json(
      { error: "client_id is required" },
      { status: 400 }
    );
  }

  const { data: runs, error } = await supabase
    .from("collection_runs")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ runs });
}
