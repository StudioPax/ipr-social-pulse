// @component InsightsPanel — AI-generated dashboard insights with caching
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronDown, ChevronUp, RefreshCw, AlertCircle } from "lucide-react";
import type { DashboardMetrics, DashboardInsights } from "./types";

interface InsightsPanelProps {
  clientId: string;
  dateRange: { startDate: string; endDate: string };
  metrics: DashboardMetrics;
}

export function InsightsPanel({ clientId, dateRange, metrics }: InsightsPanelProps) {
  const [insights, setInsights] = useState<DashboardInsights | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [modelVersion, setModelVersion] = useState<string | null>(null);
  const [postCount, setPostCount] = useState<number>(0);
  const [analyzedCount, setAnalyzedCount] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch cached insights on mount + dateRange change
  const fetchCached = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        client_id: clientId,
        start: dateRange.startDate,
        end: dateRange.endDate,
      });
      const res = await fetch(`/api/dashboard/insights?${params}`);
      const data = await res.json();
      if (data.insights) {
        setInsights(data.insights);
        setGeneratedAt(data.generated_at);
        setModelVersion(data.model_version || null);
        setPostCount(data.post_count || 0);
        setAnalyzedCount(data.analyzed_count || 0);
        setError(null);
      } else {
        setInsights(null);
        setGeneratedAt(null);
      }
    } catch {
      // Silently fail — user can manually generate
    }
  }, [clientId, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    fetchCached();
  }, [fetchCached]);

  const generateInsights = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          start_date: dateRange.startDate,
          end_date: dateRange.endDate,
          metrics,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setInsights(data.insights);
        setGeneratedAt(data.generated_at);
        setModelVersion(data.model_version || null);
        setPostCount(data.post_count || 0);
        setAnalyzedCount(data.analyzed_count || 0);
        setIsExpanded(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate insights");
    } finally {
      setIsGenerating(false);
    }
  };

  const formattedDate = generatedAt
    ? new Date(generatedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-base">AI Insights</CardTitle>
            {formattedDate && (
              <span className="text-xs text-muted-foreground ml-2">
                {formattedDate}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {insights ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateInsights}
                  disabled={isGenerating || metrics.analyzedCount === 0}
                  className="h-7 text-xs"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isGenerating ? "animate-spin" : ""}`} />
                  Regenerate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-7 w-7 p-0"
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={generateInsights}
                disabled={isGenerating || metrics.analyzedCount === 0}
                className="h-7 text-xs"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 mr-1" />
                    Generate Insights
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {error && (
        <CardContent className="pt-0 pb-3">
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        </CardContent>
      )}

      {insights && isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Executive Summary */}
          <div className="rounded-md bg-primary/5 border border-primary/10 px-4 py-3">
            <p className="text-sm font-medium leading-relaxed">{insights.executive_summary}</p>
          </div>

          {/* 2×2 Commentary Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <CommentaryBlock title="Sentiment" text={insights.sentiment_commentary} />
            <CommentaryBlock title="Performance Tiers" text={insights.tier_commentary} />
            <CommentaryBlock title="Policy Pillars" text={insights.pillar_commentary} />
            <CommentaryBlock title="Messaging Quality" text={insights.messaging_commentary} />
          </div>

          {/* Recommendations */}
          {insights.recommendations && insights.recommendations.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Recommendations
              </p>
              <ul className="space-y-1.5">
                {insights.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-xs font-mono text-muted-foreground mt-0.5">{i + 1}.</span>
                    <p className="text-sm">{rec}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer */}
          <p className="text-[10px] text-muted-foreground pt-1 border-t">
            Generated {formattedDate}
            {modelVersion && ` \u2022 ${modelVersion}`}
            {` \u2022 Based on ${postCount} posts (${analyzedCount} analyzed)`}
          </p>
        </CardContent>
      )}

      {!insights && !error && metrics.analyzedCount === 0 && (
        <CardContent className="pt-0 pb-3">
          <p className="text-xs text-muted-foreground">
            Run AI Analysis on your posts first to enable insights generation.
          </p>
        </CardContent>
      )}

      {!insights && !error && !isGenerating && metrics.analyzedCount > 0 && (
        <CardContent className="pt-0 pb-3">
          <p className="text-xs text-muted-foreground">
            Click &ldquo;Generate Insights&rdquo; to get AI-powered strategic commentary on your dashboard data.
          </p>
        </CardContent>
      )}
    </Card>
  );
}

function CommentaryBlock({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
        {title}
      </p>
      <p className="text-sm leading-relaxed">{text}</p>
    </div>
  );
}
