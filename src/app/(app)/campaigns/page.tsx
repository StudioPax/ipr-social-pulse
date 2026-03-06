// @page Campaigns — Campaign list with filter bar, card layout, and create dialog
// App Spec Module — Content campaign management for IPR research communications
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { PILLARS, CAMPAIGN_STATUSES, type CampaignStatus, type Pillar } from "@/lib/tokens";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { CampaignCreateDialog } from "@/components/data/campaign-create-dialog";

interface DocSummary {
  count: number;
  roles: string[];
  hasNotes: boolean;
}

interface ChannelSummary {
  total: number;
  published: number;
}

interface Campaign {
  id: string;
  title: string;
  status: CampaignStatus;
  research_authors: string[];
  target_audiences: string[];
  pillar_tags: string[];
  updated_at: string;
  doc_summary: DocSummary;
  channel_summary: ChannelSummary;
}

const STATUS_BADGE_CLASSES: Record<CampaignStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-100 text-emerald-800",
  completed: "bg-blue-100 text-blue-800",
  archived: "bg-muted/60 text-muted-foreground",
};

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

const PILLAR_BADGE_CLASSES: Record<string, string> = {
  Health: "bg-emerald-100 text-emerald-800",
  Democracy: "bg-blue-100 text-blue-800",
  Methods: "bg-violet-100 text-violet-800",
  Opportunity: "bg-amber-100 text-amber-800",
  Sustainability: "bg-green-100 text-green-800",
};

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "all">("all");
  const [pillarFilter, setPillarFilter] = useState<Pillar | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadCampaigns = useCallback(async (cId: string) => {
    try {
      const res = await fetch(`/api/campaigns?client_id=${cId}`);
      if (!res.ok) {
        console.error("Failed to fetch campaigns:", res.status);
        return;
      }
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error("Error loading campaigns:", err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .limit(1)
        .single();

      if (!client) {
        setLoading(false);
        return;
      }

      setClientId(client.id);
      await loadCampaigns(client.id);
      setLoading(false);
    };

    init();
  }, [loadCampaigns]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (pillarFilter !== "all" && !(c.pillar_tags || []).includes(pillarFilter)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchAuthor = (c.research_authors || []).some((a) =>
          a.toLowerCase().includes(q)
        );
        if (!matchTitle && !matchAuthor) return false;
      }
      return true;
    });
  }, [campaigns, statusFilter, pillarFilter, searchQuery]);

  const handleCreated = useCallback(
    (campaign: Campaign) => {
      setCampaigns((prev) => [campaign, ...prev]);
      setCreateOpen(false);
    },
    []
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-dashboard">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl">Content Campaigns</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage multi-channel content campaigns for IPR research communications.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ New Campaign</Button>
      </div>

      <Separator className="my-6" />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Status Filter */}
        <div className="flex items-center gap-1.5 rounded-md border border-input bg-background p-1">
          <button
            onClick={() => setStatusFilter("all")}
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium transition-colors",
              statusFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          {CAMPAIGN_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Pillar Filter */}
        <select
          value={pillarFilter}
          onChange={(e) => setPillarFilter(e.target.value as Pillar | "all")}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All Pillars</option>
          {PILLARS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {/* Search Input */}
        <Input
          placeholder="Search campaigns..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 w-56 text-xs"
        />

        {/* Result Count */}
        <span className="ml-auto text-xs text-muted-foreground font-mono tabular-nums">
          {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Campaign Cards */}
      {filteredCampaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {campaigns.length === 0
                ? "No campaigns yet. Create your first campaign to get started."
                : "No campaigns match your filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredCampaigns.map((campaign) => (
            <Card
              key={campaign.id}
              className="cursor-pointer transition-colors hover:bg-surface-hover"
              onClick={() => router.push(`/campaigns/${campaign.id}`)}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Title + metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-medium truncate">
                        {campaign.title}
                      </h3>
                      <Badge
                        className={cn(
                          "text-[10px] shrink-0",
                          STATUS_BADGE_CLASSES[campaign.status]
                        )}
                      >
                        {STATUS_LABELS[campaign.status]}
                      </Badge>
                    </div>

                    {/* Pillar Tags */}
                    {(campaign.pillar_tags || []).length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {(campaign.pillar_tags || []).map((pillar) => (
                          <Badge
                            key={pillar}
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              PILLAR_BADGE_CLASSES[pillar] || ""
                            )}
                          >
                            {pillar}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Metadata Row */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {/* Channel Progress */}
                      <span>
                        <span className="font-mono tabular-nums">
                          {(campaign.channel_summary || { published: 0 }).published}
                        </span>
                        /
                        <span className="font-mono tabular-nums">
                          {(campaign.channel_summary || { total: 0 }).total}
                        </span>
                        {" "}channels published
                      </span>

                      {/* Document Info */}
                      <span>
                        <span className="font-mono tabular-nums">
                          {campaign.doc_summary.count}
                        </span>
                        {" "}doc{campaign.doc_summary.count !== 1 ? "s" : ""}
                        {campaign.doc_summary.hasNotes ? (
                          <span className="ml-1 text-emerald-600">
                            &middot; Research Notes &#10003;
                          </span>
                        ) : (
                          <span className="ml-1 text-amber-600">
                            &middot; Needs Research Notes
                          </span>
                        )}
                      </span>

                      {/* Authors */}
                      {(campaign.research_authors || []).length > 0 && (
                        <span className="truncate max-w-xs">
                          {(campaign.research_authors || []).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Updated date */}
                  <div className="shrink-0 text-right">
                    <span className="text-xs text-muted-foreground">
                      Updated {formatDate(campaign.updated_at)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Campaign Dialog */}
      {clientId && (
        <CampaignCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          clientId={clientId}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
