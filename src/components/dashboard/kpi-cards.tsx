// @component KpiCards — 5 KPI cards with period-over-period deltas
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";
import type { DashboardMetrics } from "./types";
import { formatDelta } from "./helpers";

interface KpiCardsProps {
  metrics: DashboardMetrics;
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta == null) return null;
  if (delta === 0) return (
    <span className="ml-2 inline-flex items-center text-[10px] font-mono text-muted-foreground">
      0%
    </span>
  );
  const isPositive = delta > 0;
  return (
    <span
      className={`ml-2 inline-flex items-center gap-0.5 text-[10px] font-mono ${
        isPositive ? "text-emerald-600" : "text-red-600"
      }`}
    >
      {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {formatDelta(delta)}
    </span>
  );
}

export function KpiCards({ metrics }: KpiCardsProps) {
  const cards = [
    {
      value: metrics.totalPosts,
      label: "Total Posts",
      delta: metrics.deltaPostsPct,
      format: (v: number) => String(v),
    },
    {
      value: metrics.totalEngagement,
      label: "Total Engagement",
      delta: metrics.deltaEngagementPct,
      format: (v: number) => v.toLocaleString(),
    },
    {
      value: metrics.avgEngagement,
      label: "Avg. Engagement",
      delta: metrics.deltaAvgEngagementPct,
      format: (v: number) => String(v),
    },
    {
      value: metrics.platformCount,
      label: "Platforms Active",
      delta: metrics.deltaPlatformsPct,
      format: (v: number) => String(v),
    },
    {
      value: metrics.policyRelevanceRate,
      label: "Policy Relevance",
      delta: metrics.deltaPolicyRelevancePct,
      format: (v: number) => `${v}%`,
      subtitle: metrics.analyzedCount > 0
        ? `${metrics.analyzedCount} analyzed`
        : "No analyzed posts",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 mb-6">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-baseline">
              <p className="text-3xl font-bold font-mono">{card.format(card.value)}</p>
              <DeltaBadge delta={card.delta} />
            </div>
            <p className="text-xs text-muted-foreground">{card.label}</p>
            {"subtitle" in card && card.subtitle && (
              <p className="text-[10px] text-muted-foreground">{card.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
