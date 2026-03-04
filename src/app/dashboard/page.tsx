// @page Dashboard — Leadership Summary, NU Alignment, Opportunity Map
// App Spec Module 5 — Three dashboard views with real Supabase data
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DateRangeFilter,
  buildDateRangeValue,
  type DateRangeValue,
} from "@/components/data/date-range-filter";
import { PostsTable, type PostAnalysis } from "@/components/data/posts-table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { CHART_COLORS, TOOLTIP_STYLE, PLATFORM_COLORS, PILLAR_COLORS } from "@/lib/charts";

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

export default function DashboardPage() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [analyses, setAnalyses] = useState<Map<string, PostAnalysis>>(new Map());
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeValue>(() =>
    buildDateRangeValue("last_3_months")
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .limit(1)
      .single();

    if (!client) {
      setLoading(false);
      return;
    }

    setClientId(client.id);

    const [postsResult, analysesResult] = await Promise.all([
      supabase
        .from("posts")
        .select(
          "id, platform, post_id, content_text, content_url, published_at, likes, reposts, comments, engagement_total, hashtags, content_format, authors, pillar_tag, collected_at"
        )
        .eq("client_id", client.id)
        .gte("published_at", dateRange.startDate + "T00:00:00Z")
        .lte("published_at", dateRange.endDate + "T23:59:59Z")
        .order("published_at", { ascending: false })
        .limit(1000),
      supabase
        .from("post_analyses")
        .select(
          "post_id, pillar_primary, pillar_secondary, pillar_confidence, pillar_rationale, sentiment_label, sentiment_score, sentiment_confidence, sentiment_rationale, performance_tier, recommended_action, policy_relevance, policy_relevance_rationale, content_type, audience_fit, nu_alignment_tags, research_title, research_url, research_authors, key_topics, summary, tier_rationale, fw_values_lead_score, fw_values_lead_eval, fw_causal_chain_score, fw_causal_chain_eval, fw_cultural_freight_score, fw_cultural_freight_eval, fw_episodic_thematic_score, fw_episodic_thematic_eval, fw_solutions_framing_score, fw_solutions_framing_eval, fw_overall_score, fw_rewrite_rec"
        ),
    ]);

    const postList = postsResult.data || [];
    setPosts(postList);

    const analysisMap = new Map<string, PostAnalysis>();
    if (analysesResult.data) {
      for (const a of analysesResult.data) {
        analysisMap.set(a.post_id, a);
      }
    }
    setAnalyses(analysisMap);

    setLoading(false);
  }, [dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute KPIs
  const totalPosts = posts.length;
  const totalEngagement = posts.reduce(
    (sum, p) => sum + (p.engagement_total || 0),
    0
  );
  const avgEngagement =
    totalPosts > 0 ? Math.round(totalEngagement / totalPosts) : 0;
  const platformCount = new Set(posts.map((p) => p.platform)).size;

  // Platform distribution for pie chart
  const platformData = Object.entries(
    posts.reduce((acc, p) => {
      acc[p.platform] = (acc[p.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Engagement by platform for bar chart
  const engagementByPlatform = Object.entries(
    posts.reduce((acc, p) => {
      if (!acc[p.platform]) acc[p.platform] = { likes: 0, reposts: 0, comments: 0 };
      acc[p.platform].likes += p.likes || 0;
      acc[p.platform].reposts += p.reposts || 0;
      acc[p.platform].comments += p.comments || 0;
      return acc;
    }, {} as Record<string, { likes: number; reposts: number; comments: number }>)
  ).map(([platform, data]) => ({ platform, ...data }));

  // Posts over time (group by day, spanning full date range, with snippets for tooltip)
  const postsOverTime = (() => {
    const dayMap: Record<string, string[]> = {};
    for (const p of posts) {
      if (!p.published_at) continue;
      const day = p.published_at.split("T")[0];
      if (!dayMap[day]) dayMap[day] = [];
      const snippet = (p.content_text || "No text").slice(0, 80);
      dayMap[day].push(snippet + (snippet.length >= 80 ? "..." : ""));
    }
    const result: { date: string; count: number; snippets: string[] }[] = [];
    const cursor = new Date(dateRange.startDate + "T00:00:00");
    const end = new Date(dateRange.endDate + "T00:00:00");
    while (cursor <= end) {
      const key = cursor.toISOString().split("T")[0];
      result.push({ date: key, count: dayMap[key]?.length || 0, snippets: dayMap[key] || [] });
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  })();

  // Content format distribution
  const formatData = Object.entries(
    posts.reduce((acc, p) => {
      const fmt = p.content_format || "unknown";
      acc[fmt] = (acc[fmt] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Pillar distribution — analyzed posts only (from post_analyses)
  const pillarData = (() => {
    const counts: Record<string, number> = {};
    analyses.forEach((a) => {
      const pillar = a.pillar_primary || "Untagged";
      counts[pillar] = (counts[pillar] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  })();

  const analyzedCount = analyses.size;

  // Top performing posts — sorted by engagement across all platforms
  const topPosts = [...posts]
    .sort((a, b) => (b.engagement_total || 0) - (a.engagement_total || 0))
    .slice(0, 10);

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-4 grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded bg-muted" />
          ))}
        </div>
        <div className="mt-6 h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-dashboard">
      <h2 className="font-display text-2xl">Dashboard</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Leadership Summary, University Alignment, and Opportunity Map views.
      </p>

      <Separator className="my-6" />

      {/* Date Range Filter */}
      <div className="mb-6">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-3xl font-bold font-mono">{totalPosts}</p>
            <p className="text-xs text-muted-foreground">Total Posts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-3xl font-bold font-mono">
              {totalEngagement.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Total Engagement</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-3xl font-bold font-mono">{avgEngagement}</p>
            <p className="text-xs text-muted-foreground">Avg. Engagement</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-3xl font-bold font-mono">{platformCount}</p>
            <p className="text-xs text-muted-foreground">Platforms Active</p>
          </CardContent>
        </Card>
      </div>

      {totalPosts === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              No data yet
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Go to <span className="font-semibold">Collect</span> to pull posts
              from your social accounts, then come back here to see the
              dashboard.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="leadership" className="space-y-6">
          <TabsList>
            <TabsTrigger value="leadership">Leadership Summary</TabsTrigger>
            <TabsTrigger value="alignment">NU Alignment</TabsTrigger>
            <TabsTrigger value="opportunity">Opportunity Map</TabsTrigger>
          </TabsList>

          {/* Tab 1: Leadership Summary */}
          <TabsContent value="leadership" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Posts Over Time */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Posts Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={postsOverTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(val) => {
                          const d = new Date(val);
                          return `${d.getMonth() + 1}/${d.getDate()}`;
                        }}
                      />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload as { date: string; count: number; snippets: string[] };
                          const dateLabel = new Date(d.date + "T00:00:00").toLocaleDateString(undefined, {
                            month: "short", day: "numeric", year: "numeric",
                          });
                          return (
                            <div className="rounded-md border bg-popover px-3 py-2 shadow-md max-w-xs">
                              <p className="text-xs font-medium font-mono">{dateLabel}</p>
                              <p className="text-xs text-muted-foreground mb-1">
                                {d.count} {d.count === 1 ? "post" : "posts"}
                              </p>
                              {d.snippets.length > 0 && (
                                <ul className="space-y-1 border-t pt-1">
                                  {d.snippets.slice(0, 5).map((s, i) => (
                                    <li key={i} className="text-[11px] leading-tight text-muted-foreground">
                                      {s}
                                    </li>
                                  ))}
                                  {d.snippets.length > 5 && (
                                    <li className="text-[11px] text-muted-foreground italic">
                                      +{d.snippets.length - 5} more
                                    </li>
                                  )}
                                </ul>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke={CHART_COLORS[0]}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Platform Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Posts by Platform
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={platformData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        dataKey="value"
                        label={({ name, value }) => `${name} (${value})`}
                        labelLine={false}
                      >
                        {platformData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={
                              PLATFORM_COLORS[entry.name] || CHART_COLORS[5]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip {...TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Engagement Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Engagement by Platform
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={engagementByPlatform}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="platform" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Legend />
                    <Bar dataKey="likes" fill={CHART_COLORS[0]} stackId="a" />
                    <Bar dataKey="reposts" fill={CHART_COLORS[1]} stackId="a" />
                    <Bar dataKey="comments" fill={CHART_COLORS[2]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: NU Alignment */}
          <TabsContent value="alignment" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Pillar Distribution — Donut Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Posts by Policy Pillar
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ({analyzedCount} analyzed)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pillarData.length === 0 ? (
                    <div className="flex items-center justify-center h-[280px]">
                      <p className="text-sm text-muted-foreground text-center">
                        No analyzed posts yet.<br />
                        Run AI Analysis to see pillar distribution.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="60%" height={280}>
                        <PieChart>
                          <Pie
                            data={pillarData}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={100}
                            dataKey="value"
                            paddingAngle={2}
                            stroke="none"
                          >
                            {pillarData.map((entry) => (
                              <Cell
                                key={entry.name}
                                fill={PILLAR_COLORS[entry.name] || CHART_COLORS[5]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0].payload as { name: string; value: number };
                              const pct = analyzedCount > 0 ? Math.round((d.value / analyzedCount) * 100) : 0;
                              return (
                                <div className="rounded-md border bg-popover px-3 py-2 shadow-md">
                                  <p className="text-xs font-medium">{d.name}</p>
                                  <p className="text-xs font-mono text-muted-foreground">
                                    {d.value} posts ({pct}%)
                                  </p>
                                </div>
                              );
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Legend */}
                      <div className="flex flex-col gap-2.5 min-w-[140px]">
                        {pillarData.map((entry) => {
                          const pct = analyzedCount > 0 ? Math.round((entry.value / analyzedCount) * 100) : 0;
                          return (
                            <div key={entry.name} className="flex items-center gap-2">
                              <span
                                className="inline-block w-3 h-3 rounded-sm shrink-0"
                                style={{ backgroundColor: PILLAR_COLORS[entry.name] || CHART_COLORS[5] }}
                              />
                              <span className="text-xs">{entry.name}</span>
                              <span className="text-xs font-mono text-muted-foreground ml-auto">
                                {entry.value} ({pct}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Content Format */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Content Formats</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={formatData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={100}
                        dataKey="value"
                        paddingAngle={2}
                        stroke="none"
                        label={({ name, value }) => `${name} (${value})`}
                        labelLine={false}
                      >
                        {formatData.map((_, index) => (
                          <Cell
                            key={index}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip {...TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 3: Opportunity Map */}
          <TabsContent value="opportunity" className="space-y-6">
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
                            <Badge
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {post.platform}
                            </Badge>
                            {post.pillar_tag && (
                              <Badge
                                variant="outline"
                                className="text-[10px]"
                              >
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

            {/* All Posts — Analyze Module View */}
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
                  clientId={clientId || undefined}
                  onAnalysisUpdate={loadData}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
