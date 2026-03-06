/**
 * @module dashboard-insights-prompt — Prompt templates for AI-generated dashboard insights
 * Version: insights-v1.0
 *
 * Follows the same pattern as campaign-prompt.ts:
 *   - buildSystemPrompt() sets the persona + output format
 *   - buildUserMessage() injects pre-computed metrics (not raw posts)
 */

import type { DashboardMetrics } from "@/components/dashboard/types";

export const DASHBOARD_INSIGHTS_PROMPT_VERSION = "insights-v1.0";

export function buildInsightsSystemPrompt(): string {
  return `You are a senior social media strategist and communications advisor for Northwestern University's Institute for Policy Research (IPR).

IPR is a leading policy research institute with five policy pillars:
- Health — Health policy, public health, healthcare systems
- Democracy — Democratic institutions, governance, civic engagement
- Methods — Research methods, data science, computational approaches
- Opportunity — Economic opportunity, inequality, social mobility
- Sustainability — Environmental policy, climate, energy

You assess social media performance using four tiers:
- T1 (Policy Engine) — High engagement + high policy relevance (ideal)
- T2 (Visibility) — High engagement but moderate policy relevance
- T3 (Niche) — Low engagement but high policy relevance (niche experts)
- T4 (Underperformer) — Low engagement and low relevance

You evaluate messaging quality using the FrameWorks Institute methodology (0–10 per dimension, 0–50 total):
- Values Lead — Does the message lead with shared values?
- Causal Chain — Does it explain causes and mechanisms?
- Cultural Freight — Does it avoid reinforcing misconceptions?
- Episodic vs Thematic — Does it use systemic (thematic) framing?
- Solutions Framing — Does it point toward actionable solutions?

Given the dashboard metrics below, generate strategic insights. Return a JSON object with exactly these keys:

{
  "executive_summary": "2–3 sentence overview of social media performance for leadership. Be specific with numbers.",
  "sentiment_commentary": "1–2 sentences on sentiment distribution and what it means for audience reception.",
  "tier_commentary": "1–2 sentences on performance tier distribution and what to improve.",
  "pillar_commentary": "1–2 sentences on which pillars are over/under-represented and engagement differences.",
  "messaging_commentary": "1–2 sentences on FrameWorks scoring strengths and weaknesses.",
  "recommendations": ["3–5 specific, actionable recommendations based on the data"]
}

Return ONLY the JSON object, no markdown fences or extra text. Be direct, data-driven, and actionable.`;
}

export function buildInsightsUserMessage(metrics: DashboardMetrics): string {
  const lines: string[] = [
    "Dashboard Metrics Summary:",
    "",
    `Total Posts: ${metrics.totalPosts}`,
    `Total Engagement: ${metrics.totalEngagement.toLocaleString()}`,
    `Average Engagement per Post: ${metrics.avgEngagement}`,
    `Platforms Active: ${metrics.platformCount}`,
    `Policy Relevance Rate: ${metrics.policyRelevanceRate}% (${metrics.analyzedCount} analyzed)`,
  ];

  // Deltas
  if (metrics.deltaPostsPct != null) {
    lines.push("");
    lines.push("Period-over-Period Changes:");
    lines.push(`  Posts: ${metrics.deltaPostsPct > 0 ? "+" : ""}${metrics.deltaPostsPct}%`);
    lines.push(`  Engagement: ${metrics.deltaEngagementPct! > 0 ? "+" : ""}${metrics.deltaEngagementPct}%`);
    lines.push(`  Avg Engagement: ${metrics.deltaAvgEngagementPct! > 0 ? "+" : ""}${metrics.deltaAvgEngagementPct}%`);
    lines.push(`  Policy Relevance: ${metrics.deltaPolicyRelevancePct! > 0 ? "+" : ""}${metrics.deltaPolicyRelevancePct}%`);
  }

  // Sentiment
  if (Object.keys(metrics.sentimentCounts).length > 0) {
    lines.push("");
    lines.push("Sentiment Distribution:");
    for (const [label, count] of Object.entries(metrics.sentimentCounts)) {
      const pct = metrics.analyzedCount > 0 ? Math.round((count / metrics.analyzedCount) * 100) : 0;
      lines.push(`  ${label}: ${count} (${pct}%)`);
    }
  }

  // Tiers
  if (Object.keys(metrics.tierCounts).length > 0) {
    lines.push("");
    lines.push("Performance Tier Distribution:");
    for (const [tier, count] of Object.entries(metrics.tierCounts)) {
      const pct = metrics.analyzedCount > 0 ? Math.round((count / metrics.analyzedCount) * 100) : 0;
      lines.push(`  ${tier}: ${count} (${pct}%)`);
    }
  }

  // Actions
  if (Object.keys(metrics.actionCounts).length > 0) {
    lines.push("");
    lines.push("Recommended Actions Distribution:");
    for (const [action, count] of Object.entries(metrics.actionCounts)) {
      lines.push(`  ${action}: ${count}`);
    }
  }

  // Pillars
  if (Object.keys(metrics.pillarCounts).length > 0) {
    lines.push("");
    lines.push("Policy Pillar Distribution:");
    for (const [pillar, count] of Object.entries(metrics.pillarCounts)) {
      const pct = metrics.analyzedCount > 0 ? Math.round((count / metrics.analyzedCount) * 100) : 0;
      lines.push(`  ${pillar}: ${count} (${pct}%)`);
    }
  }

  // FrameWorks
  if (metrics.fwAverages.overall > 0) {
    lines.push("");
    lines.push("FrameWorks Messaging Scores (avg, 0–10 each):");
    lines.push(`  Values Lead: ${metrics.fwAverages.valuesLead}`);
    lines.push(`  Causal Chain: ${metrics.fwAverages.causalChain}`);
    lines.push(`  Cultural Freight: ${metrics.fwAverages.culturalFreight}`);
    lines.push(`  Episodic/Thematic: ${metrics.fwAverages.episodicThematic}`);
    lines.push(`  Solutions Framing: ${metrics.fwAverages.solutionsFraming}`);
    lines.push(`  Overall (0–50): ${metrics.fwAverages.overall}`);
  }

  lines.push("");
  lines.push("Generate strategic insights based on the above metrics.");

  return lines.join("\n");
}
