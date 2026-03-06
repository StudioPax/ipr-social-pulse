// @component SharedCampaignClient — Client-side data fetcher + renderer for shared campaign view
"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, AlertCircle, Clock } from "lucide-react";
import { SharedStrategyView } from "@/components/share/shared-strategy-view";
import { SharedChannelsView } from "@/components/share/shared-channels-view";
import { PrintableCampaign } from "@/components/share/printable-campaign";

interface SharedCampaignClientProps {
  token: string;
}

interface ShareData {
  campaign: {
    id: string;
    title: string;
    status: string;
    pillar_primary: string | null;
    pillar_secondary: string | null;
    campaign_type: string;
    channels_used: string[];
    target_audiences: string[];
    research_authors: string[] | null;
    research_url: string | null;
    publication_date: string | null;
    start_date: string | null;
    duration_weeks: number | null;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analysis: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  channels: any[];
  share: {
    created_at: string;
    expires_at: string;
  };
}

export function SharedCampaignClient({ token }: SharedCampaignClientProps) {
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/share/${token}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error || "This shared link is no longer available.");
          return;
        }
        const json = await res.json();
        setData(json);
      } catch {
        setError("Failed to load shared campaign.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading campaign...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="rounded-full bg-muted p-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Link Unavailable</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            {error || "This shared link is no longer available."}
          </p>
        </div>
      </div>
    );
  }

  const { campaign, analysis, channels, share } = data;
  const expiresAt = new Date(share.expires_at);
  const daysLeft = Math.max(
    0,
    Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return (
    <div className="space-y-6">
      {/* Campaign header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {campaign.pillar_primary && (
            <Badge variant="default" className="text-xs capitalize">
              {campaign.pillar_primary}
            </Badge>
          )}
          {campaign.pillar_secondary && (
            <Badge variant="outline" className="text-xs capitalize">
              {campaign.pillar_secondary}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs capitalize">
            {campaign.campaign_type}
          </Badge>
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {campaign.title}
        </h1>
        {campaign.research_authors && campaign.research_authors.length > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            {campaign.research_authors.join(", ")}
          </p>
        )}
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              Link expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
            </span>
          </div>
          <PrintableCampaign
            campaign={campaign}
            analysis={analysis}
            channels={channels}
          />
        </div>
      </div>

      {/* Tabs: Strategy + Campaign Plan */}
      <Tabs defaultValue="strategy">
        <TabsList>
          <TabsTrigger value="strategy">Strategy</TabsTrigger>
          <TabsTrigger value="plan">Campaign Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="strategy" className="mt-4">
          <SharedStrategyView analysis={analysis} />
        </TabsContent>

        <TabsContent value="plan" className="mt-4">
          <SharedChannelsView channels={channels} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
