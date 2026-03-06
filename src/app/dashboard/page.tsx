// @page Dashboard — Leadership Summary, NU Alignment, Opportunity Map
// App Spec Module 5 — Orchestrator with decomposed tab components
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DateRangeFilter,
  buildDateRangeValue,
  type DateRangeValue,
} from "@/components/data/date-range-filter";
import type { PostAnalysis } from "@/components/data/posts-table";
import type { PostRow } from "@/components/dashboard/types";
import { computeMetrics, computePriorRange } from "@/components/dashboard/helpers";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { LeadershipTab } from "@/components/dashboard/leadership-tab";
import { AlignmentTab } from "@/components/dashboard/alignment-tab";
import { OpportunityTab } from "@/components/dashboard/opportunity-tab";

const POST_SELECT =
  "id, platform, post_id, content_text, content_url, published_at, likes, reposts, comments, engagement_total, hashtags, content_format, authors, pillar_tag, collected_at";

const ANALYSIS_SELECT =
  "post_id, pillar_primary, pillar_secondary, pillar_confidence, pillar_rationale, sentiment_label, sentiment_score, sentiment_confidence, sentiment_rationale, performance_tier, recommended_action, policy_relevance, policy_relevance_rationale, content_type, audience_fit, nu_alignment_tags, research_title, research_url, research_authors, key_topics, summary, tier_rationale, fw_values_lead_score, fw_values_lead_eval, fw_causal_chain_score, fw_causal_chain_eval, fw_cultural_freight_score, fw_cultural_freight_eval, fw_episodic_thematic_score, fw_episodic_thematic_eval, fw_solutions_framing_score, fw_solutions_framing_eval, fw_overall_score, fw_rewrite_rec";

export default function DashboardPage() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [analyses, setAnalyses] = useState<Map<string, PostAnalysis>>(new Map());
  const [priorPosts, setPriorPosts] = useState<PostRow[]>([]);
  const [priorAnalyses, setPriorAnalyses] = useState<Map<string, PostAnalysis>>(new Map());
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

    // Compute prior period range
    const { priorStart, priorEnd } = computePriorRange(dateRange.startDate, dateRange.endDate);

    // Fetch current + prior period data in parallel
    const [postsResult, analysesResult, priorPostsResult, priorAnalysesResult] = await Promise.all([
      supabase
        .from("posts")
        .select(POST_SELECT)
        .eq("client_id", client.id)
        .gte("published_at", dateRange.startDate + "T00:00:00Z")
        .lte("published_at", dateRange.endDate + "T23:59:59Z")
        .order("published_at", { ascending: false })
        .limit(1000),
      supabase
        .from("post_analyses")
        .select(ANALYSIS_SELECT),
      supabase
        .from("posts")
        .select(POST_SELECT)
        .eq("client_id", client.id)
        .gte("published_at", priorStart + "T00:00:00Z")
        .lte("published_at", priorEnd + "T23:59:59Z")
        .order("published_at", { ascending: false })
        .limit(1000),
      supabase
        .from("post_analyses")
        .select(ANALYSIS_SELECT),
    ]);

    const postList = postsResult.data || [];
    setPosts(postList);

    const analysisMap = new Map<string, PostAnalysis>();
    if (analysesResult.data) {
      for (const a of analysesResult.data) {
        // Only include analyses for posts in the current range
        if (postList.some((p) => p.id === a.post_id)) {
          analysisMap.set(a.post_id, a);
        }
      }
    }
    setAnalyses(analysisMap);

    const priorList = priorPostsResult.data || [];
    setPriorPosts(priorList);

    const priorAnalysisMap = new Map<string, PostAnalysis>();
    if (priorAnalysesResult.data) {
      for (const a of priorAnalysesResult.data) {
        if (priorList.some((p) => p.id === a.post_id)) {
          priorAnalysisMap.set(a.post_id, a);
        }
      }
    }
    setPriorAnalyses(priorAnalysisMap);

    setLoading(false);
  }, [dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const metrics = computeMetrics(posts, analyses, priorPosts, priorAnalyses);

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-4 grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded bg-muted" />
          ))}
        </div>
        <div className="mt-6 h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const tabProps = {
    posts,
    analyses,
    dateRange,
    analyzedCount: metrics.analyzedCount,
    clientId: clientId || undefined,
    onAnalysisUpdate: loadData,
  };

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
      <KpiCards metrics={metrics} />

      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              No data yet
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Go to <span className="font-semibold">Content &gt; Import</span> to pull posts
              from your social accounts, then come back here to see the dashboard.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* AI Insights Panel */}
          {clientId && (
            <InsightsPanel
              clientId={clientId}
              dateRange={dateRange}
              metrics={metrics}
            />
          )}

          <Tabs defaultValue="leadership" className="space-y-6">
            <TabsList>
              <TabsTrigger value="leadership">Leadership Summary</TabsTrigger>
              <TabsTrigger value="alignment">NU Alignment</TabsTrigger>
              <TabsTrigger value="opportunity">Opportunity Map</TabsTrigger>
            </TabsList>

            <TabsContent value="leadership">
              <LeadershipTab {...tabProps} />
            </TabsContent>

            <TabsContent value="alignment">
              <AlignmentTab {...tabProps} />
            </TabsContent>

            <TabsContent value="opportunity">
              <OpportunityTab {...tabProps} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
