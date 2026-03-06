// @page CampaignDetail — Tabbed campaign detail view
"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft,
  FileText,
  Sparkles,
  Upload,
  Calendar,
  Users,
  Check,
} from "lucide-react";

import type { CampaignData, StrategyOutput } from "@/components/campaign-detail/types";
import { STATUS_COLORS, formatDate } from "@/components/campaign-detail/helpers";
import { CampaignContextTab } from "@/components/campaign-detail/campaign-context-tab";
import { CampaignStrategyTab } from "@/components/campaign-detail/campaign-strategy-tab";
import { CampaignPromptTab } from "@/components/campaign-detail/campaign-prompt-tab";
import { CampaignChannelsTab } from "@/components/campaign-detail/campaign-channels-tab";

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS = [
  { value: "context", label: "Context", icon: FileText },
  { value: "strategy", label: "Strategy", icon: Sparkles },
  { value: "prompt", label: "Generate & Import", icon: Upload },
  { value: "channels", label: "Campaign Plan", icon: Calendar },
] as const;

type TabValue = (typeof TABS)[number]["value"];

// ---------------------------------------------------------------------------
// Inner component (needs useSearchParams → must be inside Suspense)
// ---------------------------------------------------------------------------

function CampaignDetailInner() {
  const params = useParams();
  const campaignId = params.id as string;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [data, setData] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active tab — synced to ?tab= search param
  const initialTab = (searchParams.get("tab") as TabValue) || "context";
  const [activeTab, setActiveTab] = useState<TabValue>(
    TABS.some((t) => t.value === initialTab) ? initialTab : "context"
  );

  const handleTabChange = (value: string) => {
    const tab = value as TabValue;
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // ── Data Loading ──────────────────────────────────────────────────────

  const loadCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`);
      if (!res.ok) throw new Error("Failed to load campaign");
      const json: CampaignData = await res.json();
      setData(json);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  // ── Loading / Error ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 max-w-dashboard">
        <div className="h-5 w-40 animate-pulse rounded bg-muted mb-6" />
        <div className="h-8 w-80 animate-pulse rounded bg-muted mb-2" />
        <div className="h-4 w-60 animate-pulse rounded bg-muted mb-8" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-dashboard">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Campaigns
        </Link>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error || "Campaign not found."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Derived Data ──────────────────────────────────────────────────────

  const { campaign, documents, channels, analysis } = data;
  const includedDocs = documents.filter((d) => d.is_included);
  const totalWords = includedDocs.reduce((sum, d) => sum + (d.word_count || 0), 0);

  const strategyOutput: StrategyOutput | null = analysis
    ? {
        research_summary: analysis.research_summary || "",
        key_messages: analysis.key_messages || [],
        audience_narratives: analysis.audience_narratives || {},
        channel_strategy: analysis.channel_strategy || {},
        fw_values_lead: analysis.fw_values_lead || "",
        fw_causal_chain: analysis.fw_causal_chain || "",
        fw_cultural_freight: analysis.fw_cultural_freight || "",
        fw_thematic_bridge: analysis.fw_thematic_bridge || "",
        fw_solutions_framing: analysis.fw_solutions_framing || "",
      }
    : null;

  // Step completion indicators
  const stepComplete: Record<TabValue, boolean> = {
    context: documents.length > 0,
    strategy: analysis !== null,
    prompt: channels.length > 0,
    channels: channels.some((ch) => ch.status !== "planned"),
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-dashboard">
      {/* Back Link */}
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Campaigns
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start gap-3 mb-2">
          <h1 className="font-display text-3xl leading-tight">{campaign.title}</h1>
          <Badge className={cn("mt-1", STATUS_COLORS[campaign.status] || "")}>
            {campaign.status}
          </Badge>
        </div>

        {campaign.pillar_tags && campaign.pillar_tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {campaign.pillar_tags.map((pillar) => (
              <Badge key={pillar} variant="outline" className="text-xs">
                {pillar}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
          {campaign.research_authors && campaign.research_authors.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {campaign.research_authors.join(", ")}
            </span>
          )}
          {campaign.publication_date && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Published {formatDate(campaign.publication_date)}
            </span>
          )}
          {campaign.embargo_until && (
            <span className="inline-flex items-center gap-1.5 text-amber-600">
              Embargo until {formatDate(campaign.embargo_until)}
            </span>
          )}
          {campaign.research_doi && (
            <span className="inline-flex items-center gap-1.5">
              DOI: <span className="font-mono text-xs">{campaign.research_doi}</span>
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full justify-start gap-1 h-auto flex-wrap p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const done = stepComplete[tab.value];
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-1.5 px-3 py-1.5 text-xs sm:text-sm"
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {done && (
                  <Check className="h-3 w-3 text-emerald-600 ml-0.5" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="context" className="mt-6">
          <CampaignContextTab
            campaignId={campaignId}
            campaign={campaign}
            documents={documents}
            includedDocs={includedDocs}
            totalWords={totalWords}
            onRefresh={loadCampaign}
          />
        </TabsContent>

        <TabsContent value="strategy" className="mt-6">
          <CampaignStrategyTab
            campaignId={campaignId}
            campaign={campaign}
            analysis={analysis}
            strategyOutput={strategyOutput}
            includedDocs={includedDocs}
            onRefresh={loadCampaign}
          />
        </TabsContent>

        <TabsContent value="prompt" className="mt-6">
          <CampaignPromptTab
            campaignId={campaignId}
            campaign={campaign}
            includedDocs={includedDocs}
            strategyOutput={strategyOutput}
            existingDeliverableCount={channels.length}
            onRefresh={loadCampaign}
          />
        </TabsContent>

        <TabsContent value="channels" className="mt-6">
          <CampaignChannelsTab
            campaignId={campaignId}
            channels={channels}
            strategyOutput={strategyOutput}
            onRefresh={loadCampaign}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page wrapper (Suspense boundary for useSearchParams)
// ---------------------------------------------------------------------------

export default function CampaignDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-dashboard">
          <div className="h-5 w-40 animate-pulse rounded bg-muted mb-6" />
          <div className="h-8 w-80 animate-pulse rounded bg-muted mb-2" />
          <div className="h-4 w-60 animate-pulse rounded bg-muted mb-8" />
          <div className="h-64 animate-pulse rounded bg-muted" />
        </div>
      }
    >
      <CampaignDetailInner />
    </Suspense>
  );
}
