/**
 * @module tokens — Design token re-exports as TypeScript constants
 * UI Spec §3: Never use raw hex values — always reference tokens.
 */

export const colors = {
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  card: "hsl(var(--card))",
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  muted: "hsl(var(--muted))",
  mutedForeground: "hsl(var(--muted-foreground))",
  accent: "hsl(var(--accent))",
  destructive: "hsl(var(--destructive))",
  success: "hsl(var(--success))",
  brandAccent: "hsl(var(--brand-accent))",
  border: "hsl(var(--border))",
  surfaceHover: "hsl(var(--surface-hover))",
} as const;

export const fonts = {
  display: "font-display",   // DM Serif Display
  sans: "font-sans",         // DM Sans
  mono: "font-mono",         // JetBrains Mono
} as const;

export const contentWidths = {
  prose: "max-w-prose",       // 65ch
  content: "max-w-content",   // 900px
  dashboard: "max-w-dashboard", // 1400px
  full: "w-full",             // 100%
} as const;

/** IPR Policy Pillars */
export const PILLARS = [
  "Health",
  "Democracy",
  "Methods",
  "Opportunity",
  "Sustainability",
] as const;

export type Pillar = (typeof PILLARS)[number];

/** Performance tiers — App Spec §3.2 */
export const PERFORMANCE_TIERS = [
  "T1_PolicyEngine",
  "T2_Visibility",
  "T3_Niche",
  "T4_Underperformer",
] as const;

export type PerformanceTier = (typeof PERFORMANCE_TIERS)[number];

/** Recommended actions — App Spec §3.2 */
export const RECOMMENDED_ACTIONS = [
  "amplify",
  "template",
  "promote_niche",
  "diagnose",
  "archive",
] as const;

export type RecommendedAction = (typeof RECOMMENDED_ACTIONS)[number];

/** Dashboard date range presets */
export const DATE_RANGE_PRESETS = [
  { value: "last_month", label: "Last month" },
  { value: "last_3_months", label: "Last 3 months" },
  { value: "last_6_months", label: "Last 6 months" },
  { value: "last_year", label: "Last year" },
  { value: "custom", label: "Custom range" },
] as const;

export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number]["value"];
