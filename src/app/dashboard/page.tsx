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
import { CHART_COLORS, TOOLTIP_STYLE, PLATFORM_COLORS } from "@/lib/charts";

interface PostRow {
  id: string;
  platform: string;
  content_text: string | null;
  published_at: string | null;
  likes: number | null;
  reposts: number | null;
  comments: number | null;
  engagement_total: number | null;
  content_format: string | null;
  pillar_tag: string | null;
}

export default function DashboardPage() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .limit(1)
      .single();

    if (!client) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("posts")
      .select(
        "id, platform, content_text, published_at, likes, reposts, comments, engagement_total, content_format, pillar_tag"
      )
      .eq("client_id", client.id)
      .order("published_at", { ascending: false })
      .limit(1000);

    setPosts(data || []);
    setLoading(false);
  }, []);

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

  // Posts over time (group by day)
  const postsOverTime = Object.entries(
    posts.reduce((acc, p) => {
      if (!p.published_at) return acc;
      const day = p.published_at.split("T")[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  )
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Content format distribution
  const formatData = Object.entries(
    posts.reduce((acc, p) => {
      const fmt = p.content_format || "unknown";
      acc[fmt] = (acc[fmt] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Pillar distribution
  const pillarData = Object.entries(
    posts.reduce((acc, p) => {
      const pillar = p.pillar_tag || "Untagged";
      acc[pillar] = (acc[pillar] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

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
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip {...TOOLTIP_STYLE} />
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
              {/* Pillar Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Posts by Policy Pillar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={pillarData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 11 }}
                        width={100}
                      />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {pillarData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Content Format */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Content Formats</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={formatData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        dataKey="value"
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

            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Run <span className="font-semibold">AI Analysis</span> on
                  collected posts to see pillar alignment tags, sentiment
                  scores, and NU alignment metrics.
                </p>
                <Badge variant="outline" className="mt-2">
                  Phase 2 — Claude API Integration
                </Badge>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Opportunity Map */}
          <TabsContent value="opportunity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Top Posts by Engagement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...posts]
                    .sort(
                      (a, b) =>
                        (b.engagement_total || 0) -
                        (a.engagement_total || 0)
                    )
                    .slice(0, 5)
                    .map((post, i) => (
                      <div
                        key={post.id}
                        className="flex items-start gap-3 rounded-md border p-3"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {post.platform}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {post.published_at
                                ? new Date(
                                    post.published_at
                                  ).toLocaleDateString()
                                : "—"}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-2">
                            {post.content_text || "No text available"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono text-sm font-bold">
                            {(post.engagement_total || 0).toLocaleString()}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            engagement
                          </p>
                        </div>
                      </div>
                    ))}
                  {posts.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No posts to display. Run a collection first.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Performance tiering and recommended actions will appear here
                  after running AI analysis.
                </p>
                <Badge variant="outline" className="mt-2">
                  Phase 2 — Performance Tiers & Action Flags
                </Badge>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
