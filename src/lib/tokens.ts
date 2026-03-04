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

/** Campaign statuses */
export const CAMPAIGN_STATUSES = [
  "draft",
  "active",
  "completed",
  "archived",
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/** Campaign channel statuses */
export const CHANNEL_STATUSES = [
  "planned",
  "drafted",
  "approved",
  "published",
  "skipped",
] as const;

export type ChannelStatus = (typeof CHANNEL_STATUSES)[number];

/** Target audiences */
export const TARGET_AUDIENCES = [
  { value: "policymaker", label: "Policymaker" },
  { value: "faculty", label: "Faculty" },
  { value: "donor", label: "Donor" },
  { value: "public", label: "Public" },
  { value: "media", label: "Media" },
  { value: "nu_leadership", label: "NU Leadership" },
] as const;

export type TargetAudience = (typeof TARGET_AUDIENCES)[number]["value"];

/** Campaign channels */
export const CAMPAIGN_CHANNELS = [
  { value: "bluesky", label: "Bluesky", charLimit: 300 },
  { value: "twitter", label: "Twitter/X", charLimit: 280 },
  { value: "linkedin", label: "LinkedIn", charLimit: 3000 },
  { value: "facebook", label: "Facebook", charLimit: 63206 },
  { value: "instagram", label: "Instagram", charLimit: 2200 },
  { value: "website", label: "Website", charLimit: null },
  { value: "newsletter", label: "Newsletter", charLimit: null },
  { value: "press_release", label: "Press Release", charLimit: null },
  { value: "op_ed", label: "Op-Ed", charLimit: null },
  { value: "event", label: "Event", charLimit: null },
  { value: "podcast", label: "Podcast", charLimit: null },
] as const;

export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number]["value"];

/** Campaign types — what kind of campaign */
export const CAMPAIGN_TYPES = [
  { value: "new_research", label: "New Research", description: "Brand new research — multi-week rollout from pre-launch to measurement" },
  { value: "amplify", label: "Amplify", description: "Boost existing high-performing content" },
  { value: "policy_moment", label: "Policy Moment", description: "Rapid reactive campaign tied to a policy event (24–72hr)" },
  { value: "faculty_spotlight", label: "Faculty Spotlight", description: "Researcher profile series" },
  { value: "donor_cultivation", label: "Donor Cultivation", description: "Impact-focused donor engagement" },
] as const;

export type CampaignType = (typeof CAMPAIGN_TYPES)[number]["value"];

/** Campaign stages — phases within any campaign (renamed from CAMPAIGN_PHASES) */
export const CAMPAIGN_STAGES = [
  { value: "pre_launch", label: "Pre-Launch", description: "Teaser content, internal prep, embargo period" },
  { value: "rollout", label: "Rollout", description: "Active publishing window" },
  { value: "sustain", label: "Sustain", description: "Follow-up content, conversation monitoring" },
  { value: "measure", label: "Measure", description: "Performance review period" },
] as const;

export type CampaignStage = (typeof CAMPAIGN_STAGES)[number]["value"];

/** Duration options for New Research campaigns */
export const CAMPAIGN_DURATIONS = [
  { value: 4, label: "4 weeks" },
  { value: 6, label: "6 weeks" },
  { value: 8, label: "8 weeks" },
] as const;

/** Campaign document roles */
export const DOCUMENT_ROLES = [
  { value: "research_paper", label: "Research Paper", description: "Core research document" },
  { value: "research_notes", label: "Research Notes", description: "IPR marketing's curated summary" },
  { value: "ai_brief", label: "AI Brief", description: "AI-generated condensed summary" },
  { value: "supporting", label: "Supporting", description: "Interview transcripts, fact sheets, etc." },
] as const;

export type DocumentRole = (typeof DOCUMENT_ROLES)[number]["value"];
