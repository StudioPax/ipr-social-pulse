// @component AlignmentTab — Pillar Distribution, Pillar×Engagement, Messaging Radar, Content Formats
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { CHART_COLORS, TOOLTIP_STYLE, PILLAR_COLORS } from "@/lib/charts";
import { ChartSubtitle } from "./chart-subtitle";
import type { TabProps } from "./types";

export function AlignmentTab({ posts, analyses, analyzedCount }: TabProps) {
  // Pillar distribution (from analyses)
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

  // Pillar × Engagement — avg engagement per pillar
  const pillarEngagement = (() => {
    const pillarStats: Record<string, { total: number; count: number }> = {};
    analyses.forEach((a) => {
      if (!a.pillar_primary) return;
      const post = posts.find((p) => p.id === a.post_id);
      if (!post) return;
      if (!pillarStats[a.pillar_primary]) pillarStats[a.pillar_primary] = { total: 0, count: 0 };
      pillarStats[a.pillar_primary].total += post.engagement_total || 0;
      pillarStats[a.pillar_primary].count++;
    });
    return Object.entries(pillarStats)
      .map(([pillar, s]) => ({
        pillar,
        avgEngagement: s.count > 0 ? Math.round(s.total / s.count) : 0,
        postCount: s.count,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);
  })();

  // Messaging Framework Radar
  const radarData = (() => {
    let vl = 0, cc = 0, cf = 0, et = 0, sf = 0;
    let count = 0;
    analyses.forEach((a) => {
      if (a.fw_overall_score == null) return;
      vl += a.fw_values_lead_score || 0;
      cc += a.fw_causal_chain_score || 0;
      cf += a.fw_cultural_freight_score || 0;
      et += a.fw_episodic_thematic_score || 0;
      sf += a.fw_solutions_framing_score || 0;
      count++;
    });
    if (count === 0) return [];
    const avg = (sum: number) => Math.round((sum / count) * 10) / 10;
    return [
      { axis: "Values Lead", score: avg(vl) },
      { axis: "Causal Chain", score: avg(cc) },
      { axis: "Cultural Freight", score: avg(cf) },
      { axis: "Episodic/Thematic", score: avg(et) },
      { axis: "Solutions Framing", score: avg(sf) },
    ];
  })();

  const overallFwScore = (() => {
    let total = 0, count = 0;
    analyses.forEach((a) => {
      if (a.fw_overall_score != null) {
        total += a.fw_overall_score;
        count++;
      }
    });
    return count > 0 ? Math.round((total / count) * 10) / 10 : 0;
  })();

  // Content format distribution
  const formatData = Object.entries(
    posts.reduce((acc, p) => {
      const fmt = p.content_format || "unknown";
      acc[fmt] = (acc[fmt] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pillar Distribution Donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Posts by Policy Pillar
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({analyzedCount} analyzed)
              </span>
            </CardTitle>
            <ChartSubtitle>Distribution of posts across IPR&apos;s five policy pillars.</ChartSubtitle>
          </CardHeader>
          <CardContent>
            {pillarData.length === 0 ? (
              <div className="flex items-center justify-center h-[280px]">
                <p className="text-sm text-muted-foreground text-center">
                  No analyzed posts yet.<br />Run AI Analysis to see pillar distribution.
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
                        <Cell key={entry.name} fill={PILLAR_COLORS[entry.name] || CHART_COLORS[5]} />
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

        {/* Pillar × Engagement */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pillar × Engagement</CardTitle>
            <ChartSubtitle>Average engagement per post by policy pillar.</ChartSubtitle>
          </CardHeader>
          <CardContent>
            {pillarEngagement.length === 0 ? (
              <div className="flex items-center justify-center h-[280px]">
                <p className="text-sm text-muted-foreground text-center">
                  No analyzed posts yet.<br />Run AI Analysis to see pillar engagement.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={pillarEngagement} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="pillar" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as { pillar: string; avgEngagement: number; postCount: number };
                      return (
                        <div className="rounded-md border bg-popover px-3 py-2 shadow-md">
                          <p className="text-xs font-medium">{d.pillar}</p>
                          <p className="text-xs font-mono text-muted-foreground">
                            Avg: {d.avgEngagement} ({d.postCount} posts)
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="avgEngagement">
                    {pillarEngagement.map((entry) => (
                      <Cell key={entry.pillar} fill={PILLAR_COLORS[entry.pillar] || CHART_COLORS[5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Messaging Framework Scorecard */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Messaging Framework Scorecard</CardTitle>
            <ChartSubtitle>FrameWorks methodology scoring. Higher is better (0–10 scale).</ChartSubtitle>
          </CardHeader>
          <CardContent>
            {radarData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px]">
                <p className="text-sm text-muted-foreground text-center">
                  No FrameWorks scores yet.<br />Run AI Analysis to see messaging scorecard.
                </p>
              </div>
            ) : (
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                    <Radar
                      dataKey="score"
                      stroke={CHART_COLORS[3]}
                      fill={CHART_COLORS[3]}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as { axis: string; score: number };
                        return (
                          <div className="rounded-md border bg-popover px-3 py-2 shadow-md">
                            <p className="text-xs font-medium">{d.axis}</p>
                            <p className="text-xs font-mono text-muted-foreground">{d.score}/10</p>
                          </div>
                        );
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
                <p className="text-center text-sm font-mono text-muted-foreground mt-1">
                  Overall: <span className="font-bold text-foreground">{overallFwScore}/25</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Formats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content Formats</CardTitle>
            <ChartSubtitle>Distribution of content types across your posts.</ChartSubtitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
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
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
