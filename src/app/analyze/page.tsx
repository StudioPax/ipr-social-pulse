// @page Analyze — View collected posts + LLM analysis engine UI
// App Spec Module 3 — Posts data table with pillar tags, sentiment, tiering
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { PostsTable } from "@/components/data/posts-table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface PostRow {
  id: string;
  platform: string;
  post_id: string;
  content_text: string | null;
  content_url: string | null;
  published_at: string | null;
  likes: number | null;
  reposts: number | null;
  comments: number | null;
  engagement_total: number | null;
  hashtags: string[] | null;
  content_format: string | null;
  authors: string[] | null;
  pillar_tag: string | null;
  collected_at: string;
}

export default function AnalyzePage() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    analyzed: 0,
    platforms: {} as Record<string, number>,
  });

  const loadPosts = useCallback(async () => {
    // Get default client
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .limit(1)
      .single();

    if (!client) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, platform, post_id, content_text, content_url, published_at, likes, reposts, comments, engagement_total, hashtags, content_format, authors, pillar_tag, collected_at"
      )
      .eq("client_id", client.id)
      .order("published_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Error loading posts:", error);
      setLoading(false);
      return;
    }

    const postList = data || [];
    setPosts(postList);

    // Calculate stats
    const platformCounts: Record<string, number> = {};
    let analyzedCount = 0;
    for (const post of postList) {
      platformCounts[post.platform] = (platformCounts[post.platform] || 0) + 1;
      if (post.pillar_tag) analyzedCount++;
    }

    setStats({
      total: postList.length,
      analyzed: analyzedCount,
      platforms: platformCounts,
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-96 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-dashboard">
      <h2 className="font-display text-2xl">Analyze</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        View collected posts and run AI analysis for sentiment, pillar alignment, and tiering.
      </p>

      <Separator className="my-6" />

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold font-mono">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Posts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold font-mono">{stats.analyzed}</p>
            <p className="text-xs text-muted-foreground">Analyzed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold font-mono">
              {stats.total - stats.analyzed}
            </p>
            <p className="text-xs text-muted-foreground">Pending Analysis</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap gap-1">
              {Object.entries(stats.platforms).map(([platform, count]) => (
                <Badge key={platform} variant="secondary" className="text-[10px]">
                  {platform}: {count}
                </Badge>
              ))}
              {Object.keys(stats.platforms).length === 0 && (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">By Platform</p>
          </CardContent>
        </Card>
      </div>

      {/* Posts Table */}
      <PostsTable posts={posts} />
    </div>
  );
}
