// @component OpportunityTab — Tier Breakdown, Actions Summary, Top Posts, All Posts
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CHART_COLORS, TIER_COLORS, ACTION_COLORS } from "@/lib/charts";
import { TIER_LABELS, ACTION_LABELS } from "@/lib/tokens";
import { PostsTable } from "@/components/data/posts-table";
import { ChartSubtitle } from "./chart-subtitle";
import type { TabProps } from "./types";

export function OpportunityTab({ posts, analyses, analyzedCount, clientId, onAnalysisUpdate }: TabProps) {
  // Performance Tier Breakdown
  const tierData = (() => {
    const counts: Record<string, number> = {};
    analyses.forEach((a) => {
      if (a.performance_tier) {
        counts[a.performance_tier] = (counts[a.performance_tier] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([tier, count]) => ({
        tier,
        label: TIER_LABELS[tier] || tier,
        count,
      }))
      .sort((a, b) => {
        // Sort by tier order: T1, T2, T3, T4
        const order = ["T1_PolicyEngine", "T2_Visibility", "T3_Niche", "T4_Underperformer"];
        return order.indexOf(a.tier) - order.indexOf(b.tier);
      });
  })();

  // Recommended Actions Summary
  const actionData = (() => {
    const counts: Record<string, number> = {};
    analyses.forEach((a) => {
      if (a.recommended_action) {
        counts[a.recommended_action] = (counts[a.recommended_action] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([action, count]) => ({
        action,
        label: ACTION_LABELS[action] || action,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  })();

  // Top performing posts
  const topPosts = [...posts]
    .sort((a, b) => (b.engagement_total || 0) - (a.engagement_total || 0))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Performance Tier Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Performance Tiers
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({analyzedCount} analyzed)
              </span>
            </CardTitle>
            <ChartSubtitle>T1 = high engagement + policy relevance. Goal: grow T1+T2 share.</ChartSubtitle>
          </CardHeader>
          <CardContent>
            {tierData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px]">
                <p className="text-sm text-muted-foreground text-center">
                  No analyzed posts yet.<br />Run AI Analysis to see tier breakdown.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={tierData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={130} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as { label: string; count: number; tier: string };
                      const pct = analyzedCount > 0 ? Math.round((d.count / analyzedCount) * 100) : 0;
                      return (
                        <div className="rounded-md border bg-popover px-3 py-2 shadow-md">
                          <p className="text-xs font-medium">{d.label}</p>
                          <p className="text-xs font-mono text-muted-foreground">
                            {d.count} posts ({pct}%)
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count">
                    {tierData.map((entry) => (
                      <Cell key={entry.tier} fill={TIER_COLORS[entry.tier] || CHART_COLORS[5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recommended Actions Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Recommended Actions
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({analyzedCount} analyzed)
              </span>
            </CardTitle>
            <ChartSubtitle>AI-recommended next steps for each post.</ChartSubtitle>
          </CardHeader>
          <CardContent>
            {actionData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px]">
                <p className="text-sm text-muted-foreground text-center">
                  No analyzed posts yet.<br />Run AI Analysis to see recommended actions.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={actionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as { label: string; count: number };
                      const pct = analyzedCount > 0 ? Math.round((d.count / analyzedCount) * 100) : 0;
                      return (
                        <div className="rounded-md border bg-popover px-3 py-2 shadow-md">
                          <p className="text-xs font-medium">{d.label}</p>
                          <p className="text-xs font-mono text-muted-foreground">
                            {d.count} posts ({pct}%)
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count">
                    {actionData.map((entry) => (
                      <Cell key={entry.action} fill={ACTION_COLORS[entry.action] || CHART_COLORS[5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Posts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Top Performing Posts
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              by engagement across all platforms
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topPosts.map((post, i) => {
              const analysis = analyses.get(post.id);
              return (
                <div
                  key={post.id}
                  className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted/30 transition-colors"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold font-mono text-primary">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">
                        {post.platform}
                      </Badge>
                      {post.pillar_tag && (
                        <Badge variant="outline" className="text-[10px]">
                          {post.pillar_tag}
                        </Badge>
                      )}
                      {analysis?.sentiment_label && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            analysis.sentiment_label === "positive"
                              ? "border-emerald-300 text-emerald-700"
                              : analysis.sentiment_label === "negative"
                                ? "border-red-300 text-red-700"
                                : "border-gray-300 text-gray-600"
                          }`}
                        >
                          {analysis.sentiment_label}
                        </Badge>
                      )}
                      {analysis?.performance_tier && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono ${
                            analysis.performance_tier === "T1_PolicyEngine"
                              ? "border-purple-300 text-purple-700"
                              : analysis.performance_tier === "T2_Visibility"
                                ? "border-blue-300 text-blue-700"
                                : "border-gray-300 text-gray-600"
                          }`}
                        >
                          {analysis.performance_tier.split("_")[0]}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {post.published_at
                          ? new Date(post.published_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                    </div>
                    <p className="text-sm line-clamp-2">
                      {analysis?.summary || post.content_text || "No text available"}
                    </p>
                    {post.content_url && (
                      <a
                        href={post.content_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline mt-0.5 inline-block"
                      >
                        View post
                      </a>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-sm font-bold tabular-nums">
                      {(post.engagement_total || 0).toLocaleString()}
                    </p>
                    <div className="text-[10px] text-muted-foreground font-mono tabular-nums">
                      <span>{post.likes || 0}L</span>{" "}
                      <span>{post.reposts || 0}R</span>{" "}
                      <span>{post.comments || 0}C</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {posts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No posts to display. Run a collection first.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* All Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            All Posts
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {posts.length} posts in range
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PostsTable
            posts={posts}
            analyses={analyses}
            clientId={clientId}
            onAnalysisUpdate={onAnalysisUpdate}
          />
        </CardContent>
      </Card>
    </div>
  );
}
