// @component PostsTable — Data table for collected posts
// Uses shadcn/ui Table + TanStack Table v8
// Features: sortable columns, collapsible filter bar, expandable detail rows
"use client";

import { useState, useMemo, useCallback, Fragment } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ExpandedState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Post {
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

const PLATFORM_COLORS: Record<string, string> = {
  bluesky: "bg-[#0085FF] text-white",
  twitter: "bg-[#1DA1F2] text-white",
  linkedin: "bg-[#0A66C2] text-white",
  facebook: "bg-[#1877F2] text-white",
  instagram: "bg-[#E4405F] text-white",
};

const PILLAR_COLORS: Record<string, string> = {
  Health: "bg-emerald-100 text-emerald-800",
  Democracy: "bg-blue-100 text-blue-800",
  Methods: "bg-violet-100 text-violet-800",
  Opportunity: "bg-amber-100 text-amber-800",
  Sustainability: "bg-green-100 text-green-800",
};

export interface PostAnalysis {
  post_id: string;
  pillar_primary: string | null;
  pillar_secondary: string | null;
  pillar_confidence: number | null;
  pillar_rationale: string | null;
  sentiment_label: string | null;
  sentiment_score: number | null;
  sentiment_confidence: number | null;
  sentiment_rationale: string | null;
  performance_tier: string | null;
  recommended_action: string | null;
  policy_relevance: number | null;
  policy_relevance_rationale: string | null;
  content_type: string | null;
  audience_fit: string | null;
  nu_alignment_tags: string[] | null;
  research_title: string | null;
  research_url: string | null;
  research_authors: string[] | null;
  key_topics: string[] | null;
  summary: string | null;
  tier_rationale: string | null;
  fw_values_lead_score: number | null;
  fw_values_lead_eval: string | null;
  fw_causal_chain_score: number | null;
  fw_causal_chain_eval: string | null;
  fw_cultural_freight_score: number | null;
  fw_cultural_freight_eval: string | null;
  fw_episodic_thematic_score: number | null;
  fw_episodic_thematic_eval: string | null;
  fw_solutions_framing_score: number | null;
  fw_solutions_framing_eval: string | null;
  fw_overall_score: number | null;
  fw_rewrite_rec: string | null;
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "bg-emerald-100 text-emerald-800",
  negative: "bg-red-100 text-red-800",
  neutral: "bg-gray-100 text-gray-700",
  mixed: "bg-amber-100 text-amber-800",
};

const TIER_COLORS: Record<string, string> = {
  T1_PolicyEngine: "bg-purple-100 text-purple-800",
  T2_Visibility: "bg-blue-100 text-blue-800",
  T3_Niche: "bg-amber-100 text-amber-800",
  T4_Underperformer: "bg-gray-100 text-gray-600",
};

const TIER_LABELS: Record<string, string> = {
  T1_PolicyEngine: "T1",
  T2_Visibility: "T2",
  T3_Niche: "T3",
  T4_Underperformer: "T4",
};

const TIER_FULL_LABELS: Record<string, string> = {
  T1_PolicyEngine: "T1 — Policy Engine",
  T2_Visibility: "T2 — Visibility",
  T3_Niche: "T3 — Niche",
  T4_Underperformer: "T4 — Underperformer",
};

const ACTION_LABELS: Record<string, string> = {
  amplify: "Amplify",
  template: "Template",
  promote_niche: "Promote",
  diagnose: "Diagnose",
  archive: "Archive",
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  research_promo: "Research Promo",
  achievement: "Achievement",
  policy: "Policy",
  event: "Event",
  general: "General",
};

const AUDIENCE_LABELS: Record<string, string> = {
  policymaker: "Policymaker",
  faculty: "Faculty",
  donor: "Donor",
  public: "Public",
  mixed: "Mixed",
};

const SENTIMENT_ORDER: Record<string, number> = {
  positive: 0,
  neutral: 1,
  mixed: 2,
  negative: 3,
};

const TIER_ORDER: Record<string, number> = {
  T1_PolicyEngine: 0,
  T2_Visibility: 1,
  T3_Niche: 2,
  T4_Underperformer: 3,
};

const ACTION_ORDER: Record<string, number> = {
  amplify: 0,
  template: 1,
  promote_niche: 2,
  diagnose: 3,
  archive: 4,
};

const COLUMN_TOOLTIPS: Record<string, string> = {
  sentiment:
    "Post tone based on communicative intent. Positive = promoting work; Negative = expressing concern; Mixed = conflicting signals.",
  tier:
    "T1 Policy Engine: high engagement + policy relevance. T2 Visibility: high engagement, lower policy fit. T3 Niche: low engagement but policy-relevant. T4 Underperformer: low on both.",
  action:
    "Amplify: boost high performers. Template: use as model. Promote: invest in niche content. Diagnose: investigate underperformance. Archive: low relevance.",
};

// --- Filter definitions ---
interface FilterOption {
  value: string;
  label: string;
  color?: string;
}

interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
}

function buildFilterGroups(
  posts: Post[],
  analyses?: Map<string, PostAnalysis>
): FilterGroup[] {
  const platforms = Array.from(new Set(posts.map((p) => p.platform))).sort();
  const pillars = Array.from(new Set(posts.map((p) => p.pillar_tag).filter(Boolean))).sort() as string[];

  const sentiments = new Set<string>();
  const tiers = new Set<string>();
  const actions = new Set<string>();
  const contentTypes = new Set<string>();
  const audiences = new Set<string>();

  if (analyses) {
    analyses.forEach((a) => {
      if (a.sentiment_label) sentiments.add(a.sentiment_label);
      if (a.performance_tier) tiers.add(a.performance_tier);
      if (a.recommended_action) actions.add(a.recommended_action);
      if (a.content_type) contentTypes.add(a.content_type);
      if (a.audience_fit) audiences.add(a.audience_fit);
    });
  }

  return [
    {
      key: "platform",
      label: "Platform",
      options: platforms.map((p) => ({
        value: p,
        label: p.charAt(0).toUpperCase() + p.slice(1),
        color: PLATFORM_COLORS[p],
      })),
    },
    {
      key: "pillar",
      label: "Pillar",
      options: pillars.map((p) => ({
        value: p,
        label: p,
        color: PILLAR_COLORS[p],
      })),
    },
    {
      key: "sentiment",
      label: "Sentiment",
      options: Array.from(sentiments)
        .sort((a, b) => (SENTIMENT_ORDER[a] ?? 99) - (SENTIMENT_ORDER[b] ?? 99))
        .map((s) => ({
          value: s,
          label: s.charAt(0).toUpperCase() + s.slice(1),
          color: SENTIMENT_COLORS[s],
        })),
    },
    {
      key: "tier",
      label: "Tier",
      options: Array.from(tiers)
        .sort((a, b) => (TIER_ORDER[a] ?? 99) - (TIER_ORDER[b] ?? 99))
        .map((t) => ({
          value: t,
          label: TIER_FULL_LABELS[t] || t,
          color: TIER_COLORS[t],
        })),
    },
    {
      key: "action",
      label: "Action",
      options: Array.from(actions)
        .sort((a, b) => (ACTION_ORDER[a] ?? 99) - (ACTION_ORDER[b] ?? 99))
        .map((a) => ({
          value: a,
          label: ACTION_LABELS[a] || a,
        })),
    },
    {
      key: "content_type",
      label: "Content Type",
      options: Array.from(contentTypes).sort().map((c) => ({
        value: c,
        label: CONTENT_TYPE_LABELS[c] || c,
      })),
    },
    {
      key: "audience",
      label: "Audience",
      options: Array.from(audiences).sort().map((a) => ({
        value: a,
        label: AUDIENCE_LABELS[a] || a,
      })),
    },
  ];
}

type ActiveFilters = Record<string, Set<string>>;

function matchesFilters(
  post: Post,
  analysis: PostAnalysis | undefined,
  filters: ActiveFilters
): boolean {
  for (const [key, values] of Object.entries(filters)) {
    if (values.size === 0) continue;
    let postValue: string | null = null;
    switch (key) {
      case "platform":
        postValue = post.platform;
        break;
      case "pillar":
        postValue = post.pillar_tag;
        break;
      case "sentiment":
        postValue = analysis?.sentiment_label ?? null;
        break;
      case "tier":
        postValue = analysis?.performance_tier ?? null;
        break;
      case "action":
        postValue = analysis?.recommended_action ?? null;
        break;
      case "content_type":
        postValue = analysis?.content_type ?? null;
        break;
      case "audience":
        postValue = analysis?.audience_fit ?? null;
        break;
    }
    if (!postValue || !values.has(postValue)) return false;
  }
  return true;
}

// --- Expanded row detail ---
function ExpandedRowDetail({
  post,
  analysis,
}: {
  post: Post;
  analysis: PostAnalysis | undefined;
}) {
  if (!analysis) {
    return (
      <div className="px-4 py-3 text-sm text-muted-foreground italic">
        No analysis data available. Run an analysis to see details.
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4 bg-muted/30">
      {/* Summary + Full Text */}
      <div className="space-y-2">
        {analysis.summary && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Summary</p>
            <p className="text-sm mt-0.5">{analysis.summary}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Full Text</p>
          <p className="text-sm mt-0.5 whitespace-pre-wrap">{post.content_text || "—"}</p>
        </div>
      </div>

      {/* Key Topics + Hashtags */}
      <div className="flex flex-wrap gap-6">
        {analysis.key_topics && analysis.key_topics.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Key Topics</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {analysis.key_topics.map((topic, i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {post.hashtags && post.hashtags.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hashtags</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {post.hashtags.map((tag, i) => (
                <Badge key={i} variant="outline" className="text-[10px] font-mono">
                  {tag.startsWith("#") ? tag : `#${tag}`}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Analysis Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Pillar */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pillar</p>
          <div className="mt-1 flex items-center gap-1.5">
            <Badge className={`text-[10px] ${PILLAR_COLORS[analysis.pillar_primary || ""] || "bg-muted"}`}>
              {analysis.pillar_primary}
            </Badge>
            {analysis.pillar_secondary && (
              <Badge variant="outline" className="text-[10px]">
                {analysis.pillar_secondary}
              </Badge>
            )}
          </div>
          {analysis.pillar_confidence != null && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Confidence: {Math.round(analysis.pillar_confidence * 100)}%
            </p>
          )}
        </div>

        {/* Sentiment */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sentiment</p>
          <div className="mt-1 flex items-center gap-1.5">
            <Badge className={`text-[10px] ${SENTIMENT_COLORS[analysis.sentiment_label || ""] || "bg-muted"}`}>
              {analysis.sentiment_label}
            </Badge>
            {analysis.sentiment_score != null && (
              <span className="text-[10px] font-mono text-muted-foreground">
                ({analysis.sentiment_score > 0 ? "+" : ""}{analysis.sentiment_score.toFixed(2)})
              </span>
            )}
          </div>
          {analysis.sentiment_confidence != null && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Confidence: {Math.round(analysis.sentiment_confidence * 100)}%
            </p>
          )}
        </div>

        {/* Performance */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Performance</p>
          <div className="mt-1">
            <Badge className={`text-[10px] ${TIER_COLORS[analysis.performance_tier || ""] || "bg-muted"}`}>
              {TIER_FULL_LABELS[analysis.performance_tier || ""] || analysis.performance_tier}
            </Badge>
          </div>
          {analysis.policy_relevance != null && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Policy Relevance: {Math.round(analysis.policy_relevance * 100)}%
            </p>
          )}
        </div>

        {/* Classification */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Classification</p>
          <div className="mt-1 space-y-0.5 text-xs">
            <p><span className="text-muted-foreground">Type:</span> {CONTENT_TYPE_LABELS[analysis.content_type || ""] || analysis.content_type || "—"}</p>
            <p><span className="text-muted-foreground">Audience:</span> {AUDIENCE_LABELS[analysis.audience_fit || ""] || analysis.audience_fit || "—"}</p>
            <p><span className="text-muted-foreground">Action:</span> {ACTION_LABELS[analysis.recommended_action || ""] || analysis.recommended_action || "—"}</p>
          </div>
        </div>
      </div>

      {/* Rationales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {analysis.pillar_rationale && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pillar Rationale</p>
            <p className="text-sm text-muted-foreground mt-0.5 italic">{analysis.pillar_rationale}</p>
          </div>
        )}
        {analysis.sentiment_rationale && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sentiment Rationale</p>
            <p className="text-sm text-muted-foreground mt-0.5 italic">{analysis.sentiment_rationale}</p>
          </div>
        )}
        {analysis.policy_relevance_rationale && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Policy Relevance</p>
            <p className="text-sm text-muted-foreground mt-0.5 italic">{analysis.policy_relevance_rationale}</p>
          </div>
        )}
        {analysis.tier_rationale && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tier Assessment</p>
            <p className="text-sm text-muted-foreground mt-0.5 italic">{analysis.tier_rationale}</p>
          </div>
        )}
      </div>

      {/* FrameWorks Strategic Communications Analysis */}
      {analysis.fw_overall_score != null && (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              FrameWorks Strategic Communications
            </p>
            <Badge
              variant="outline"
              className={`font-mono text-xs ${
                analysis.fw_overall_score >= 20
                  ? "border-emerald-300 text-emerald-700"
                  : analysis.fw_overall_score >= 15
                    ? "border-amber-300 text-amber-700"
                    : "border-red-300 text-red-700"
              }`}
            >
              {analysis.fw_overall_score}/25
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              { label: "Values Lead", score: analysis.fw_values_lead_score, eval: analysis.fw_values_lead_eval },
              { label: "Causal Chain", score: analysis.fw_causal_chain_score, eval: analysis.fw_causal_chain_eval },
              { label: "Cultural Freight", score: analysis.fw_cultural_freight_score, eval: analysis.fw_cultural_freight_eval },
              { label: "Episodic vs. Thematic", score: analysis.fw_episodic_thematic_score, eval: analysis.fw_episodic_thematic_eval },
              { label: "Solutions Framing", score: analysis.fw_solutions_framing_score, eval: analysis.fw_solutions_framing_eval },
            ].map((dim) => (
              <div key={dim.label}>
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[10px] font-medium text-muted-foreground">{dim.label}</p>
                  <span className={`text-xs font-mono font-bold ${
                    (dim.score || 0) >= 4
                      ? "text-emerald-600"
                      : (dim.score || 0) >= 3
                        ? "text-amber-600"
                        : "text-red-600"
                  }`}>
                    {dim.score}/5
                  </span>
                </div>
                {/* Score bar */}
                <div className="flex gap-0.5 mb-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      className={`h-1 flex-1 rounded-full ${
                        n <= (dim.score || 0)
                          ? (dim.score || 0) >= 4
                            ? "bg-emerald-400"
                            : (dim.score || 0) >= 3
                              ? "bg-amber-400"
                              : "bg-red-400"
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                {dim.eval && (
                  <p className="text-[11px] text-muted-foreground leading-snug">{dim.eval}</p>
                )}
              </div>
            ))}
          </div>
          {analysis.fw_rewrite_rec && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Rewrite Recommendation</p>
              <p className="text-sm mt-0.5 italic text-muted-foreground">{analysis.fw_rewrite_rec}</p>
            </div>
          )}
        </div>
      )}

      {/* Research Linkage */}
      {analysis.research_title && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Research Linkage</p>
          <div className="mt-1 text-sm">
            <p className="font-medium">{analysis.research_title}</p>
            {analysis.research_authors && analysis.research_authors.length > 0 && (
              <p className="text-xs text-muted-foreground">{analysis.research_authors.join(", ")}</p>
            )}
            {analysis.research_url && (
              <a
                href={analysis.research_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline"
              >
                View research
              </a>
            )}
          </div>
        </div>
      )}

      {/* NU Alignment */}
      {analysis.nu_alignment_tags &&
        analysis.nu_alignment_tags.length > 0 &&
        !analysis.nu_alignment_tags.includes("none") && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">NU Alignment</p>
            <div className="flex gap-1 mt-1">
              {analysis.nu_alignment_tags.map((tag, i) => (
                <Badge key={i} variant="outline" className="text-[10px] capitalize">
                  {tag.replace("_", " ")}
                </Badge>
              ))}
            </div>
          </div>
        )}

      {/* Post link */}
      {post.content_url && (
        <div className="pt-2 border-t">
          <a
            href={post.content_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent hover:underline"
          >
            View original post →
          </a>
        </div>
      )}
    </div>
  );
}

// --- Main component ---
export function PostsTable({
  posts,
  analyses,
}: {
  posts: Post[];
  analyses?: Map<string, PostAnalysis>;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "published_at", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});

  const filterGroups = useMemo(
    () => buildFilterGroups(posts, analyses),
    [posts, analyses]
  );

  const activeFilterCount = useMemo(
    () => Object.values(activeFilters).reduce((sum, s) => sum + s.size, 0),
    [activeFilters]
  );

  const toggleFilter = useCallback((groupKey: string, value: string) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      const set = new Set(prev[groupKey] || []);
      if (set.has(value)) {
        set.delete(value);
      } else {
        set.add(value);
      }
      next[groupKey] = set;
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters({});
  }, []);

  // Pre-filter posts based on chip filters (before passing to TanStack)
  const filteredPosts = useMemo(() => {
    if (activeFilterCount === 0) return posts;
    return posts.filter((post) =>
      matchesFilters(post, analyses?.get(post.id), activeFilters)
    );
  }, [posts, analyses, activeFilters, activeFilterCount]);

  const columns = useMemo<ColumnDef<Post>[]>(
    () => [
      {
        id: "expander",
        header: "",
        size: 30,
        cell: ({ row }) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              row.toggleExpanded();
            }}
            className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted text-foreground/70 hover:text-foreground transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className={`transition-transform duration-150 ${row.getIsExpanded() ? "rotate-90" : ""}`}
            >
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ),
      },
      {
        accessorKey: "platform",
        header: "Platform",
        size: 90,
        cell: ({ row }) => {
          const platform = row.getValue("platform") as string;
          return (
            <Badge
              className={`text-[10px] ${PLATFORM_COLORS[platform] || "bg-muted"}`}
            >
              {platform}
            </Badge>
          );
        },
      },
      {
        accessorKey: "content_text",
        header: "Content",
        size: 350,
        cell: ({ row }) => {
          const text = row.getValue("content_text") as string | null;
          const analysis = analyses?.get(row.original.id);
          const url = row.original.content_url;
          return (
            <div className="max-w-[350px]">
              <p className="text-sm truncate">{analysis?.summary || text || "—"}</p>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline"
                >
                  View post
                </a>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "published_at",
        header: "Published",
        size: 100,
        cell: ({ row }) => {
          const date = row.getValue("published_at") as string | null;
          if (!date) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="text-xs text-muted-foreground">
              {new Date(date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          );
        },
      },
      {
        accessorKey: "engagement_total",
        header: "Engagement",
        size: 90,
        cell: ({ row }) => {
          const total = row.getValue("engagement_total") as number | null;
          const likes = row.original.likes || 0;
          const reposts = row.original.reposts || 0;
          const comments = row.original.comments || 0;
          return (
            <div className="text-right">
              <span className="font-mono text-sm font-medium">
                {total?.toLocaleString() ?? "0"}
              </span>
              <div className="text-[10px] text-muted-foreground">
                {likes}L {reposts}R {comments}C
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "pillar_tag",
        header: "Pillar",
        size: 110,
        cell: ({ row }) => {
          const pillar = row.getValue("pillar_tag") as string | null;
          if (!pillar) {
            return (
              <span className="text-xs text-muted-foreground italic">
                Untagged
              </span>
            );
          }
          return (
            <Badge className={`text-[10px] ${PILLAR_COLORS[pillar] || "bg-muted"}`}>
              {pillar}
            </Badge>
          );
        },
      },
      {
        id: "sentiment",
        header: () => (
          <span title={COLUMN_TOOLTIPS.sentiment} className="underline decoration-dotted decoration-muted-foreground/50 underline-offset-4">
            Sentiment
          </span>
        ),
        accessorFn: (row) => {
          const a = analyses?.get(row.id);
          return a?.sentiment_label || "";
        },
        sortingFn: (rowA, rowB) => {
          const a = analyses?.get(rowA.original.id)?.sentiment_label || "";
          const b = analyses?.get(rowB.original.id)?.sentiment_label || "";
          return (SENTIMENT_ORDER[a] ?? 99) - (SENTIMENT_ORDER[b] ?? 99);
        },
        size: 90,
        cell: ({ row }) => {
          const analysis = analyses?.get(row.original.id);
          if (!analysis?.sentiment_label) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <Badge
              className={`text-[10px] ${SENTIMENT_COLORS[analysis.sentiment_label] || "bg-muted"}`}
            >
              {analysis.sentiment_label}
            </Badge>
          );
        },
      },
      {
        id: "tier",
        header: () => (
          <span title={COLUMN_TOOLTIPS.tier} className="underline decoration-dotted decoration-muted-foreground/50 underline-offset-4">
            Tier
          </span>
        ),
        accessorFn: (row) => {
          const a = analyses?.get(row.id);
          return a?.performance_tier || "";
        },
        sortingFn: (rowA, rowB) => {
          const a = analyses?.get(rowA.original.id)?.performance_tier || "";
          const b = analyses?.get(rowB.original.id)?.performance_tier || "";
          return (TIER_ORDER[a] ?? 99) - (TIER_ORDER[b] ?? 99);
        },
        size: 50,
        cell: ({ row }) => {
          const analysis = analyses?.get(row.original.id);
          if (!analysis?.performance_tier) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <Badge
              className={`text-[10px] ${TIER_COLORS[analysis.performance_tier] || "bg-muted"}`}
              title={analysis.performance_tier}
            >
              {TIER_LABELS[analysis.performance_tier] || analysis.performance_tier}
            </Badge>
          );
        },
      },
      {
        id: "action",
        header: () => (
          <span title={COLUMN_TOOLTIPS.action} className="underline decoration-dotted decoration-muted-foreground/50 underline-offset-4">
            Action
          </span>
        ),
        accessorFn: (row) => {
          const a = analyses?.get(row.id);
          return a?.recommended_action || "";
        },
        sortingFn: (rowA, rowB) => {
          const a = analyses?.get(rowA.original.id)?.recommended_action || "";
          const b = analyses?.get(rowB.original.id)?.recommended_action || "";
          return (ACTION_ORDER[a] ?? 99) - (ACTION_ORDER[b] ?? 99);
        },
        size: 80,
        cell: ({ row }) => {
          const analysis = analyses?.get(row.original.id);
          if (!analysis?.recommended_action) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <span className="text-xs font-medium capitalize">
              {ACTION_LABELS[analysis.recommended_action] || analysis.recommended_action}
            </span>
          );
        },
      },
    ],
    [analyses]
  );

  const table = useReactTable({
    data: filteredPosts,
    columns,
    state: { sorting, globalFilter, expanded },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    initialState: {
      pagination: { pageSize: 25 },
    },
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search posts..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm"
          />
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="shrink-0"
          >
            Filters
            {activeFilterCount > 0 && (
              <Badge className="ml-1.5 bg-white/20 text-[10px] px-1.5 py-0">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs text-muted-foreground"
            >
              Clear all
            </Button>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {table.getFilteredRowModel().rows.length} posts
        </span>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          {filterGroups.map((group) => (
            <div key={group.key}>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.options.map((opt) => {
                  const isActive = activeFilters[group.key]?.has(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggleFilter(group.key, opt.value)}
                      className={`
                        inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium
                        transition-all border
                        ${
                          isActive
                            ? opt.color
                              ? `${opt.color} border-transparent ring-1 ring-offset-1 ring-accent`
                              : "bg-accent text-white border-transparent"
                            : "bg-background text-muted-foreground border-border hover:border-foreground/30"
                        }
                      `}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={
                      header.id === "expander"
                        ? "w-[30px] px-1"
                        : "cursor-pointer select-none"
                    }
                    onClick={
                      header.id === "expander"
                        ? undefined
                        : header.column.getToggleSortingHandler()
                    }
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() === "asc" && " ↑"}
                      {header.column.getIsSorted() === "desc" && " ↓"}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  No posts found. Run a collection first.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => row.toggleExpanded()}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={cell.column.id === "expander" ? "px-1" : undefined}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() && (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="p-0"
                      >
                        <ExpandedRowDetail
                          post={row.original}
                          analysis={analyses?.get(row.original.id)}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
