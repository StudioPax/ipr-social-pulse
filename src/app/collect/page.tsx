// @page Collect — Social media data collection UI
// App Spec Module 1 — Post collection with date range, platform select, content types
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const PLATFORMS = [
  { id: "bluesky", label: "Bluesky", ready: true },
  { id: "twitter", label: "Twitter / X", ready: false },
  { id: "linkedin", label: "LinkedIn", ready: false },
  { id: "facebook", label: "Facebook", ready: false },
  { id: "instagram", label: "Instagram", ready: false },
] as const;

const COLLECT_MODES = [
  { id: "feed", label: "Account Feed", description: "Pull posts from configured account" },
  { id: "search", label: "Keyword Search", description: "Search public posts by keyword" },
] as const;

interface CollectionRun {
  id: string;
  status: string;
  platforms: string[];
  posts_collected: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export default function CollectPage() {
  // Client state
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["bluesky"]);
  const [collectMode, setCollectMode] = useState<"feed" | "search">("feed");
  const [searchQuery, setSearchQuery] = useState("Northwestern IPR");
  const [dateStart, setDateStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateEnd, setDateEnd] = useState(() => new Date().toISOString().split("T")[0]);
  const [minEngagement, setMinEngagement] = useState(0);

  // Run state
  const [isCollecting, setIsCollecting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    posts_collected: number;
    errors?: string[];
    status: string;
  } | null>(null);

  // History
  const [runs, setRuns] = useState<CollectionRun[]>([]);

  // Load client and run history
  const loadData = useCallback(async () => {
    const { data: clients } = await supabase
      .from("clients")
      .select("id")
      .limit(1)
      .single();

    if (clients) {
      setClientId(clients.id);

      const { data: runHistory } = await supabase
        .from("collection_runs")
        .select("*")
        .eq("client_id", clients.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (runHistory) setRuns(runHistory);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle platform selection
  function togglePlatform(platformId: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    );
  }

  // Run collection
  async function handleCollect() {
    if (!clientId || selectedPlatforms.length === 0) return;

    setIsCollecting(true);
    setLastResult(null);

    try {
      const res = await fetch("/api/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          platforms: selectedPlatforms,
          time_range_start: new Date(dateStart).toISOString(),
          time_range_end: new Date(dateEnd + "T23:59:59").toISOString(),
          min_engagement: minEngagement,
          search_query: collectMode === "search" ? searchQuery : undefined,
          collect_mode: collectMode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLastResult({
          posts_collected: 0,
          errors: [data.error || "Unknown error"],
          status: "failed",
        });
      } else {
        setLastResult(data);
        // Reload run history
        loadData();
      }
    } catch (err) {
      setLastResult({
        posts_collected: 0,
        errors: [err instanceof Error ? err.message : "Network error"],
        status: "failed",
      });
    } finally {
      setIsCollecting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-content">
      <h2 className="font-display text-2xl">Collect Posts</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pull social media posts from configured platforms into the database.
      </p>

      <Separator className="my-6" />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: Collection Form */}
        <div className="space-y-6">
          {/* Platform Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Platforms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((platform) => {
                  const isSelected = selectedPlatforms.includes(platform.id);
                  return (
                    <button
                      key={platform.id}
                      onClick={() => platform.ready && togglePlatform(platform.id)}
                      disabled={!platform.ready}
                      className={`
                        flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium
                        transition-colors
                        ${isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:bg-surface-hover"
                        }
                        ${!platform.ready ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                      `}
                    >
                      {platform.label}
                      {!platform.ready && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Soon
                        </Badge>
                      )}
                      {isSelected && platform.ready && (
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Collection Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Collection Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                {COLLECT_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setCollectMode(mode.id as "feed" | "search")}
                    className={`
                      flex-1 rounded-lg border px-4 py-3 text-left transition-colors
                      ${collectMode === mode.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-surface-hover"
                      }
                    `}
                  >
                    <div className="text-sm font-medium">{mode.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {mode.description}
                    </div>
                  </button>
                ))}
              </div>

              {collectMode === "search" && (
                <div className="space-y-2">
                  <Label htmlFor="search-query">Search Keywords</Label>
                  <Input
                    id="search-query"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. Northwestern IPR, policy research"
                  />
                  <p className="text-xs text-muted-foreground">
                    Search public posts containing these keywords.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Date Range & Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date-start">Start Date</Label>
                  <Input
                    id="date-start"
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date-end">End Date</Label>
                  <Input
                    id="date-end"
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="min-engagement">Min. Engagement</Label>
                <Input
                  id="min-engagement"
                  type="number"
                  min={0}
                  value={minEngagement}
                  onChange={(e) => setMinEngagement(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Only collect posts with at least this many total engagements (likes + reposts + replies).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Run Button */}
          <Button
            size="lg"
            className="w-full"
            onClick={handleCollect}
            disabled={isCollecting || selectedPlatforms.length === 0}
          >
            {isCollecting ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4" fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Collecting...
              </span>
            ) : (
              `Collect from ${selectedPlatforms.length} platform${selectedPlatforms.length !== 1 ? "s" : ""}`
            )}
          </Button>

          {/* Last Result */}
          {lastResult && (
            <Card className={lastResult.status === "failed" ? "border-destructive" : "border-success"}>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${lastResult.status === "failed" ? "bg-destructive" : "bg-success"}`} />
                  <div>
                    <p className="text-sm font-medium">
                      {lastResult.status === "failed"
                        ? "Collection failed"
                        : `Collected ${lastResult.posts_collected} posts`}
                    </p>
                    {lastResult.errors && lastResult.errors.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {lastResult.errors.join("; ")}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Run History */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Recent Runs
          </h3>
          {runs.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center">
                <p className="text-sm text-muted-foreground">No collection runs yet.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Run your first collection to see results here.
                </p>
              </CardContent>
            </Card>
          ) : (
            runs.map((run) => (
              <Card key={run.id}>
                <CardContent className="py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          run.status === "completed"
                            ? "bg-success"
                            : run.status === "running"
                            ? "bg-accent animate-pulse"
                            : "bg-destructive"
                        }`}
                      />
                      <span className="text-xs font-medium capitalize">
                        {run.status}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {run.started_at
                        ? new Date(run.started_at).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {run.platforms.map((p) => (
                      <Badge
                        key={p}
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {p}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Posts collected</span>
                    <span className="font-mono font-medium">
                      {run.posts_collected ?? "—"}
                    </span>
                  </div>
                  {run.error_message && (
                    <p className="text-xs text-destructive truncate">
                      {run.error_message}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
