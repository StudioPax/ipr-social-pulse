// @module dashboard/helpers — Metric computation, deltas, week grouping

import type { PostAnalysis } from "@/components/data/posts-table";
import type { PostRow, DashboardMetrics } from "./types";

/** Compute all dashboard metrics from posts + analyses, with optional prior-period comparison */
export function computeMetrics(
  posts: PostRow[],
  analyses: Map<string, PostAnalysis>,
  priorPosts: PostRow[],
  priorAnalyses: Map<string, PostAnalysis>
): DashboardMetrics {
  const totalPosts = posts.length;
  const totalEngagement = posts.reduce((s, p) => s + (p.engagement_total || 0), 0);
  const avgEngagement = totalPosts > 0 ? Math.round(totalEngagement / totalPosts) : 0;
  const platformCount = new Set(posts.map((p) => p.platform)).size;

  // Policy relevance rate
  let policyRelevantCount = 0;
  const analyzedCount = analyses.size;
  analyses.forEach((a) => {
    if (a.policy_relevance != null && a.policy_relevance > 0.5) {
      policyRelevantCount++;
    }
  });
  const policyRelevanceRate = analyzedCount > 0
    ? Math.round((policyRelevantCount / analyzedCount) * 100)
    : 0;

  // Prior-period metrics
  const priorTotal = priorPosts.length;
  const priorEngagement = priorPosts.reduce((s, p) => s + (p.engagement_total || 0), 0);
  const priorAvg = priorTotal > 0 ? Math.round(priorEngagement / priorTotal) : 0;
  const priorPlatforms = new Set(priorPosts.map((p) => p.platform)).size;
  let priorPolicyRelevant = 0;
  const priorAnalyzedCount = priorAnalyses.size;
  priorAnalyses.forEach((a) => {
    if (a.policy_relevance != null && a.policy_relevance > 0.5) {
      priorPolicyRelevant++;
    }
  });
  const priorPolicyRate = priorAnalyzedCount > 0
    ? Math.round((priorPolicyRelevant / priorAnalyzedCount) * 100)
    : 0;

  const hasPrior = priorTotal > 0;

  // Distribution counts
  const sentimentCounts: Record<string, number> = {};
  const tierCounts: Record<string, number> = {};
  const actionCounts: Record<string, number> = {};
  const pillarCounts: Record<string, number> = {};
  let fwValuesSum = 0, fwCausalSum = 0, fwCulturalSum = 0, fwEpisodicSum = 0, fwSolutionsSum = 0, fwOverallSum = 0;
  let fwCount = 0;

  analyses.forEach((a) => {
    if (a.sentiment_label) {
      sentimentCounts[a.sentiment_label] = (sentimentCounts[a.sentiment_label] || 0) + 1;
    }
    if (a.performance_tier) {
      tierCounts[a.performance_tier] = (tierCounts[a.performance_tier] || 0) + 1;
    }
    if (a.recommended_action) {
      actionCounts[a.recommended_action] = (actionCounts[a.recommended_action] || 0) + 1;
    }
    if (a.pillar_primary) {
      pillarCounts[a.pillar_primary] = (pillarCounts[a.pillar_primary] || 0) + 1;
    }
    if (a.fw_overall_score != null) {
      fwValuesSum += a.fw_values_lead_score || 0;
      fwCausalSum += a.fw_causal_chain_score || 0;
      fwCulturalSum += a.fw_cultural_freight_score || 0;
      fwEpisodicSum += a.fw_episodic_thematic_score || 0;
      fwSolutionsSum += a.fw_solutions_framing_score || 0;
      fwOverallSum += a.fw_overall_score || 0;
      fwCount++;
    }
  });

  const fwAvg = (sum: number) => fwCount > 0 ? Math.round((sum / fwCount) * 10) / 10 : 0;

  return {
    totalPosts,
    totalEngagement,
    avgEngagement,
    platformCount,
    policyRelevanceRate,
    analyzedCount,
    deltaPostsPct: hasPrior ? computeDelta(totalPosts, priorTotal) : null,
    deltaEngagementPct: hasPrior ? computeDelta(totalEngagement, priorEngagement) : null,
    deltaAvgEngagementPct: hasPrior ? computeDelta(avgEngagement, priorAvg) : null,
    deltaPlatformsPct: hasPrior ? computeDelta(platformCount, priorPlatforms) : null,
    deltaPolicyRelevancePct: hasPrior ? computeDelta(policyRelevanceRate, priorPolicyRate) : null,
    sentimentCounts,
    tierCounts,
    actionCounts,
    pillarCounts,
    fwAverages: {
      valuesLead: fwAvg(fwValuesSum),
      causalChain: fwAvg(fwCausalSum),
      culturalFreight: fwAvg(fwCulturalSum),
      episodicThematic: fwAvg(fwEpisodicSum),
      solutionsFraming: fwAvg(fwSolutionsSum),
      overall: fwAvg(fwOverallSum),
    },
  };
}

/** Compute percentage change: ((current - prior) / prior) * 100 */
export function computeDelta(current: number, prior: number): number {
  if (prior === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prior) / prior) * 100);
}

/** Format a delta percentage for display: "+12%" or "-5%" */
export function formatDelta(delta: number): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta}%`;
}

/** Group posts by ISO week for trend charts */
export function groupByWeek(
  posts: PostRow[],
  dateRange: { startDate: string; endDate: string }
): { week: string; avgEngagement: number; postCount: number }[] {
  const weekMap: Record<string, { totalEngagement: number; count: number }> = {};

  for (const p of posts) {
    if (!p.published_at) continue;
    const date = new Date(p.published_at);
    const weekStart = getWeekStart(date);
    const key = weekStart.toISOString().split("T")[0];
    if (!weekMap[key]) weekMap[key] = { totalEngagement: 0, count: 0 };
    weekMap[key].totalEngagement += p.engagement_total || 0;
    weekMap[key].count++;
  }

  // Build full week series spanning the range
  const result: { week: string; avgEngagement: number; postCount: number }[] = [];
  const cursor = getWeekStart(new Date(dateRange.startDate + "T00:00:00"));
  const end = new Date(dateRange.endDate + "T00:00:00");

  while (cursor <= end) {
    const key = cursor.toISOString().split("T")[0];
    const data = weekMap[key];
    result.push({
      week: key,
      avgEngagement: data ? Math.round(data.totalEngagement / data.count) : 0,
      postCount: data?.count || 0,
    });
    cursor.setDate(cursor.getDate() + 7);
  }

  return result;
}

/** Get the Monday of the week for a given date */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Compute the prior date range by shifting backward by the range length */
export function computePriorRange(startDate: string, endDate: string): { priorStart: string; priorEnd: string } {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const diffMs = end.getTime() - start.getTime();
  const priorEnd = new Date(start.getTime() - 1); // day before current start
  const priorStart = new Date(priorEnd.getTime() - diffMs);
  return {
    priorStart: priorStart.toISOString().split("T")[0],
    priorEnd: priorEnd.toISOString().split("T")[0],
  };
}
