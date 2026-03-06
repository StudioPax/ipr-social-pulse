// @module dashboard/types — Shared interfaces for dashboard components

import type { PostAnalysis } from "@/components/data/posts-table";

/** Post row shape from Supabase posts table */
export interface PostRow {
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

/** Computed dashboard metrics with optional prior-period deltas */
export interface DashboardMetrics {
  totalPosts: number;
  totalEngagement: number;
  avgEngagement: number;
  platformCount: number;
  policyRelevanceRate: number;
  analyzedCount: number;

  // Prior-period deltas (null if no prior data)
  deltaPostsPct: number | null;
  deltaEngagementPct: number | null;
  deltaAvgEngagementPct: number | null;
  deltaPlatformsPct: number | null;
  deltaPolicyRelevancePct: number | null;

  // Distribution data for AI insights
  sentimentCounts: Record<string, number>;
  tierCounts: Record<string, number>;
  actionCounts: Record<string, number>;
  pillarCounts: Record<string, number>;
  fwAverages: {
    valuesLead: number;
    causalChain: number;
    culturalFreight: number;
    episodicThematic: number;
    solutionsFraming: number;
    overall: number;
  };
}

/** AI-generated insights stored in dashboard_insights table */
export interface DashboardInsights {
  executive_summary: string;
  sentiment_commentary: string;
  tier_commentary: string;
  pillar_commentary: string;
  messaging_commentary: string;
  recommendations: string[];
}

/** Props shared by all tab components */
export interface TabProps {
  posts: PostRow[];
  analyses: Map<string, PostAnalysis>;
  dateRange: { startDate: string; endDate: string };
  analyzedCount: number;
  clientId?: string;
  onAnalysisUpdate?: () => void;
}
