// @component LeadershipTab — Posts Over Time, Engagement Trend, Sentiment, Platform charts
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CHART_COLORS, TOOLTIP_STYLE, PLATFORM_COLORS, SENTIMENT_COLORS } from "@/lib/charts";
import { ChartSubtitle } from "./chart-subtitle";
import { groupByWeek } from "./helpers";
import type { TabProps } from "./types";

export function LeadershipTab({ posts, analyses, dateRange, analyzedCount }: TabProps) {
  // Posts over time (group by day, spanning full date range)
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

  // Engagement trend (weekly avg)
  const engagementTrend = groupByWeek(posts, dateRange);

  // Sentiment distribution
  const sentimentData = (() => {
    const counts: Record<string, number> = {};
    analyses.forEach((a) => {
      if (a.sentiment_label) {
        counts[a.sentiment_label] = (counts[a.sentiment_label] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  })();

  // Platform distribution
  const platformData = Object.entries(
    posts.reduce((acc, p) => {
      acc[p.platform] = (acc[p.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Engagement by platform
  const engagementByPlatform = Object.entries(
    posts.reduce((acc, p) => {
      if (!acc[p.platform]) acc[p.platform] = { likes: 0, reposts: 0, comments: 0 };
      acc[p.platform].likes += p.likes || 0;
      acc[p.platform].reposts += p.reposts || 0;
      acc[p.platform].comments += p.comments || 0;
      return acc;
    }, {} as Record<string, { likes: number; reposts: number; comments: number }>)
  ).map(([platform, data]) => ({ platform, ...data }));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Posts Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Posts Over Time</CardTitle>
            <ChartSubtitle>Post volume over the selected date range.</ChartSubtitle>
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
                <Line type="monotone" dataKey="count" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Engagement Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Engagement Trend</CardTitle>
            <ChartSubtitle>Weekly average engagement per post over time.</ChartSubtitle>
          </CardHeader>
          <CardContent>
            {engagementTrend.length === 0 ? (
              <div className="flex items-center justify-center h-[250px]">
                <p className="text-sm text-muted-foreground">No data available.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={engagementTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="week"
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
                      const d = payload[0].payload as { week: string; avgEngagement: number; postCount: number; snippets: string[] };
                      const weekLabel = new Date(d.week + "T00:00:00").toLocaleDateString(undefined, {
                        month: "short", day: "numeric", year: "numeric",
                      });
                      return (
                        <div className="rounded-md border bg-popover px-3 py-2 shadow-md max-w-xs">
                          <p className="text-xs font-medium font-mono">Week of {weekLabel}</p>
                          <p className="text-xs text-muted-foreground mb-1">
                            Avg: {d.avgEngagement} / post &middot; {d.postCount} {d.postCount === 1 ? "post" : "posts"}
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
                  <Line type="monotone" dataKey="avgEngagement" stroke={CHART_COLORS[2]} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sentiment Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Sentiment Distribution
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({analyzedCount} analyzed)
              </span>
            </CardTitle>
            <ChartSubtitle>How your audience receives your content. Aim for 60%+ positive.</ChartSubtitle>
          </CardHeader>
          <CardContent>
            {sentimentData.length === 0 ? (
              <div className="flex items-center justify-center h-[280px]">
                <p className="text-sm text-muted-foreground text-center">
                  No analyzed posts yet.<br />Run AI Analysis to see sentiment.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={280}>
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={100}
                      dataKey="value"
                      paddingAngle={2}
                      stroke="none"
                    >
                      {sentimentData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={SENTIMENT_COLORS[entry.name] || CHART_COLORS[5]}
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
                            <p className="text-xs font-medium capitalize">{d.name}</p>
                            <p className="text-xs font-mono text-muted-foreground">
                              {d.value} posts ({pct}%)
                            </p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2.5 min-w-[140px]">
                  {sentimentData.map((entry) => {
                    const pct = analyzedCount > 0 ? Math.round((entry.value / analyzedCount) * 100) : 0;
                    return (
                      <div key={entry.name} className="flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-sm shrink-0"
                          style={{ backgroundColor: SENTIMENT_COLORS[entry.name] || CHART_COLORS[5] }}
                        />
                        <span className="text-xs capitalize">{entry.name}</span>
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

        {/* Posts by Platform */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Posts by Platform</CardTitle>
            <ChartSubtitle>Volume of posts collected per social platform.</ChartSubtitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
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
                    <Cell key={entry.name} fill={PLATFORM_COLORS[entry.name] || CHART_COLORS[5]} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Engagement by Platform */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Engagement by Platform</CardTitle>
          <ChartSubtitle>Total likes, reposts, and comments broken down by platform.</ChartSubtitle>
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
    </div>
  );
}
