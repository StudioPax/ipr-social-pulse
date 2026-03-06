/**
 * @module charts — Shared Recharts configuration
 * UI Spec §5.2: Chart colors, tooltip style, and shared config
 */

/** Colorblind-safe chart palette (8 stops) — UI Spec §7 */
export const CHART_COLORS = [
  "hsl(var(--chart-1))", // #2563EB blue
  "hsl(var(--chart-2))", // #D97706 amber
  "hsl(var(--chart-3))", // #16A34A green
  "hsl(var(--chart-4))", // #9333EA purple
  "hsl(var(--chart-5))", // #DB2777 pink
  "hsl(var(--chart-6))", // #0891B2 cyan
  "hsl(var(--chart-7))", // #65A30D lime
  "hsl(var(--chart-8))", // #EA580C orange
] as const;

/** Shared tooltip style — UI Spec §5.2: Dark surface, monospace, sharp corners */
export const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 0,
    fontFamily: "var(--font-mono)",
    fontSize: "0.75rem",
  },
  labelStyle: {
    fontWeight: 600,
    marginBottom: 4,
  },
};

/** IPR Policy Pillars — consistent colors across all charts */
export const PILLAR_COLORS: Record<string, string> = {
  Health: CHART_COLORS[0],
  Democracy: CHART_COLORS[1],
  Methods: CHART_COLORS[2],
  Opportunity: CHART_COLORS[3],
  Sustainability: CHART_COLORS[4],
};

/** Platform colors for social media charts */
export const PLATFORM_COLORS: Record<string, string> = {
  linkedin: "#0A66C2",
  twitter: "#1DA1F2",
  facebook: "#1877F2",
  instagram: "#E4405F",
  bluesky: "#0085FF",
};

/** Sentiment colors — green/cyan/red/amber */
export const SENTIMENT_COLORS: Record<string, string> = {
  positive: CHART_COLORS[2],   // green
  neutral: CHART_COLORS[5],    // cyan
  negative: CHART_COLORS[4],   // pink/red
  mixed: CHART_COLORS[1],      // amber
};

/** Performance tier colors — purple/blue/amber/orange */
export const TIER_COLORS: Record<string, string> = {
  T1_PolicyEngine: CHART_COLORS[3],   // purple
  T2_Visibility: CHART_COLORS[0],     // blue
  T3_Niche: CHART_COLORS[1],          // amber
  T4_Underperformer: CHART_COLORS[7], // orange
};

/** Recommended action colors */
export const ACTION_COLORS: Record<string, string> = {
  amplify: CHART_COLORS[2],       // green
  template: CHART_COLORS[0],      // blue
  promote_niche: CHART_COLORS[3], // purple
  diagnose: CHART_COLORS[1],      // amber
  archive: CHART_COLORS[7],       // orange
};
