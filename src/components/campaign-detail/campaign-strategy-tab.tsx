// @component CampaignStrategyTab — Strategy display/edit/regenerate + SSE log
"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  TARGET_AUDIENCES,
  CAMPAIGN_CHANNELS,
} from "@/lib/tokens";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Check,
  Loader2,
  Sparkles,
  Pencil,
  Save,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import type {
  Campaign,
  CampaignAnalysis,
  CampaignDocument,
  StrategyOutput,
  AudienceNarrative,
  SSELogEntry,
} from "./types";
import { formatDate, getAudienceLabel } from "./helpers";
import { SSEGenerationLog } from "./sse-generation-log";

interface CampaignStrategyTabProps {
  campaignId: string;
  campaign: Campaign;
  analysis: CampaignAnalysis | null;
  strategyOutput: StrategyOutput | null;
  includedDocs: CampaignDocument[];
  onRefresh: () => Promise<void>;
}

export function CampaignStrategyTab({
  campaignId,
  campaign,
  analysis,
  strategyOutput,
  includedDocs,
  onRefresh,
}: CampaignStrategyTabProps) {
  const { toast } = useToast();

  // Strategy generation form state
  const [selectedAudiences, setSelectedAudiences] = useState<Set<string>>(new Set());
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [selectedModel, setSelectedModel] = useState("claude");

  // SSE generation state
  const [generating, setGenerating] = useState(false);
  const [generationLog, setGenerationLog] = useState<SSELogEntry[]>([]);
  const [logExpanded, setLogExpanded] = useState(false);

  // Regenerate state
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [showRegenerateConfig, setShowRegenerateConfig] = useState(false);

  // Messaging Guidance edit state
  const [editingMessaging, setEditingMessaging] = useState(false);
  const [messagingForm, setMessagingForm] = useState({
    fw_values_lead: "",
    fw_causal_chain: "",
    fw_cultural_freight: "",
    fw_thematic_bridge: "",
    fw_solutions_framing: "",
  });
  const [savingMessaging, setSavingMessaging] = useState(false);

  // Audience Narrative edit state
  const [editingAudience, setEditingAudience] = useState<string | null>(null);
  const [audienceForm, setAudienceForm] = useState<AudienceNarrative>({
    hook: "",
    framing: "",
    key_stat: "",
    call_to_action: "",
    tone: "",
  });
  const [savingAudience, setSavingAudience] = useState(false);

  // Pre-select target audiences from campaign
  useEffect(() => {
    if (campaign.target_audiences) {
      setSelectedAudiences(new Set(campaign.target_audiences));
    }
  }, [campaign.target_audiences]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const toggleAudience = (audience: string) => {
    setSelectedAudiences((prev) => {
      const next = new Set(prev);
      if (next.has(audience)) next.delete(audience);
      else next.add(audience);
      return next;
    });
  };

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channel)) next.delete(channel);
      else next.add(channel);
      return next;
    });
  };

  // SSE streaming helper
  const runSSEGeneration = async (
    url: string,
    body: Record<string, unknown>
  ) => {
    setGenerating(true);
    setGenerationLog([]);
    setLogExpanded(false);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Error", description: err.error || "Generation failed." });
        setGenerating(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const entry: SSELogEntry = JSON.parse(line.slice(6));
              entry.timestamp = new Date().toISOString();
              setGenerationLog((prev) => [...prev, entry]);

              if (entry.level === "done") {
                toast({
                  title: "Strategy generated",
                  description: entry.message,
                });
                onRefresh();
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Error", description: msg });
    } finally {
      setGenerating(false);
      setShowRegenerateConfig(false);
    }
  };

  const handleGenerateStrategy = () => {
    runSSEGeneration(
      `/api/campaigns/${campaignId}/generate-strategy`,
      {
        client_id: campaign.client_id,
        model: selectedModel,
        target_audiences: Array.from(selectedAudiences),
        channels: Array.from(selectedChannels),
      }
    );
  };

  // Messaging edit
  const startEditMessaging = () => {
    if (!strategyOutput) return;
    setMessagingForm({
      fw_values_lead: strategyOutput.fw_values_lead || "",
      fw_causal_chain: strategyOutput.fw_causal_chain || "",
      fw_cultural_freight: strategyOutput.fw_cultural_freight || "",
      fw_thematic_bridge: strategyOutput.fw_thematic_bridge || "",
      fw_solutions_framing: strategyOutput.fw_solutions_framing || "",
    });
    setEditingMessaging(true);
    setEditingAudience(null);
  };

  const cancelEditMessaging = () => setEditingMessaging(false);

  const saveMessaging = async () => {
    setSavingMessaging(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/analysis`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messagingForm),
      });
      if (!res.ok) throw new Error("Failed to update messaging guidance");
      toast({
        title: "Messaging guidance updated",
        description: "Your edits have been saved.",
      });
      setEditingMessaging(false);
      await onRefresh();
    } catch {
      toast({ title: "Error", description: "Failed to save messaging guidance." });
    } finally {
      setSavingMessaging(false);
    }
  };

  // Audience edit
  const startEditAudience = (audienceKey: string) => {
    if (!strategyOutput?.audience_narratives) return;
    const narrative = strategyOutput.audience_narratives[audienceKey];
    if (!narrative) return;
    setAudienceForm({
      hook: narrative.hook || "",
      framing: narrative.framing || "",
      key_stat: narrative.key_stat || "",
      call_to_action: narrative.call_to_action || "",
      tone: narrative.tone || "",
    });
    setEditingAudience(audienceKey);
    setEditingMessaging(false);
  };

  const cancelEditAudience = () => setEditingAudience(null);

  const saveAudience = async () => {
    if (!editingAudience || !strategyOutput?.audience_narratives) return;
    setSavingAudience(true);
    try {
      const updatedNarratives = {
        ...strategyOutput.audience_narratives,
        [editingAudience]: audienceForm,
      };
      const res = await fetch(`/api/campaigns/${campaignId}/analysis`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience_narratives: updatedNarratives }),
      });
      if (!res.ok) throw new Error("Failed to update audience narrative");
      toast({
        title: "Audience narrative updated",
        description: `${getAudienceLabel(editingAudience)} narrative saved.`,
      });
      setEditingAudience(null);
      await onRefresh();
    } catch {
      toast({ title: "Error", description: "Failed to save audience narrative." });
    } finally {
      setSavingAudience(false);
    }
  };

  // ── Shared audience/channel/model selection JSX ───────────────────────

  const renderSelectionForm = (idPrefix: string) => (
    <>
      {/* Target Audiences */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Target Audiences
        </Label>
        <div className="flex flex-wrap gap-2">
          {TARGET_AUDIENCES.map((aud) => {
            const isSelected = selectedAudiences.has(aud.value);
            return (
              <button
                key={aud.value}
                type="button"
                onClick={() => toggleAudience(aud.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {isSelected && <Check className="h-3 w-3" />}
                {aud.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Channels */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Channels
        </Label>
        <div className="flex flex-wrap gap-2">
          {CAMPAIGN_CHANNELS.map((ch) => {
            const isSelected = selectedChannels.has(ch.value);
            return (
              <button
                key={ch.value}
                type="button"
                onClick={() => toggleChannel(ch.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {isSelected && <Check className="h-3 w-3" />}
                {ch.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Model Selector */}
      <div className="space-y-2 max-w-xs">
        <Label htmlFor={`${idPrefix}-model-select`} className="text-xs uppercase tracking-wider text-muted-foreground">
          AI Model
        </Label>
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger id={`${idPrefix}-model-select`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="claude">Claude (claude-sonnet-4)</SelectItem>
            <SelectItem value="gemini">Gemini (gemini-3-pro-preview)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Validation messages */}
      {includedDocs.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Include at least one document to generate a strategy.
        </p>
      )}
      {includedDocs.length > 0 && selectedAudiences.size === 0 && (
        <p className="text-xs text-muted-foreground">
          Select at least one target audience.
        </p>
      )}
      {includedDocs.length > 0 && selectedAudiences.size > 0 && selectedChannels.size === 0 && (
        <p className="text-xs text-muted-foreground">
          Select at least one channel.
        </p>
      )}
    </>
  );

  const isGenerateDisabled =
    generating ||
    includedDocs.length === 0 ||
    selectedAudiences.size === 0 ||
    selectedChannels.size === 0;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl">Campaign Strategy</h2>
        {strategyOutput && !showRegenerateConfig && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRegenerateDialog(true)}
            disabled={generating}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate
          </Button>
        )}
      </div>

      {/* Regenerate Confirmation Dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Regenerate Strategy?
            </DialogTitle>
            <DialogDescription>
              This will <strong className="text-foreground">replace the existing strategy and update all channel content plans</strong> with
              new AI-generated content. Any manual edits to channel content will be
              overwritten for channels included in the new generation.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>What happens:</strong>
            </p>
            <ul className="text-sm text-amber-700 dark:text-amber-300 mt-1 ml-4 list-disc space-y-0.5">
              <li>Strategy analysis will be regenerated from scratch</li>
              <li>Channel plans for selected channels will be replaced</li>
              <li>You can pick different audiences, channels, and AI model</li>
            </ul>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRegenerateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowRegenerateDialog(false);
                setShowRegenerateConfig(true);
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Continue to Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {strategyOutput ? (
        <div className="space-y-6">
          {/* Research Summary */}
          {strategyOutput.research_summary && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Research Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {strategyOutput.research_summary}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Key Messages */}
          {strategyOutput.key_messages && strategyOutput.key_messages.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Key Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {strategyOutput.key_messages.map((msg, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="font-mono tabular-nums text-muted-foreground shrink-0 w-5 text-right">
                        {i + 1}.
                      </span>
                      <span className="leading-relaxed">{msg}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Meridian Messaging Guidance */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Meridian Messaging Guidance</CardTitle>
                {!editingMessaging && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={startEditMessaging}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingMessaging ? (
                <div className="space-y-4">
                  {[
                    { key: "fw_values_lead", label: "Values Lead" },
                    { key: "fw_causal_chain", label: "Causal Chain" },
                    { key: "fw_cultural_freight", label: "Cultural Freight / Avoid" },
                    { key: "fw_thematic_bridge", label: "Thematic Bridge" },
                    { key: "fw_solutions_framing", label: "Solutions Framing" },
                  ].map((item) => (
                    <div key={item.key} className="space-y-1">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        {item.label}
                      </Label>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={messagingForm[item.key as keyof typeof messagingForm]}
                        onChange={(e) =>
                          setMessagingForm((prev) => ({
                            ...prev,
                            [item.key]: e.target.value,
                          }))
                        }
                        disabled={savingMessaging}
                        rows={3}
                      />
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={saveMessaging}
                      disabled={savingMessaging}
                    >
                      {savingMessaging ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      {savingMessaging ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelEditMessaging}
                      disabled={savingMessaging}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: "Values Lead", value: strategyOutput.fw_values_lead },
                    { label: "Causal Chain", value: strategyOutput.fw_causal_chain },
                    { label: "Cultural Freight / Avoid", value: strategyOutput.fw_cultural_freight },
                    { label: "Thematic Bridge", value: strategyOutput.fw_thematic_bridge },
                    { label: "Solutions Framing", value: strategyOutput.fw_solutions_framing },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                        {item.label}
                      </p>
                      <p className="text-sm leading-relaxed">
                        {item.value || <span className="text-muted-foreground italic">--</span>}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audience Narratives */}
          {strategyOutput.audience_narratives &&
            Object.keys(strategyOutput.audience_narratives).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Audience Narratives</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs
                    defaultValue={Object.keys(strategyOutput.audience_narratives)[0]}
                  >
                    <TabsList className="flex-wrap h-auto gap-1">
                      {Object.keys(strategyOutput.audience_narratives).map((aud) => (
                        <TabsTrigger key={aud} value={aud} className="text-xs">
                          {getAudienceLabel(aud)}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {Object.entries(strategyOutput.audience_narratives).map(
                      ([aud, narrative]) => (
                        <TabsContent key={aud} value={aud}>
                          {editingAudience === aud ? (
                            <div className="space-y-4 mt-3">
                              <div className="space-y-1">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                  Hook
                                </Label>
                                <textarea
                                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                  value={audienceForm.hook}
                                  onChange={(e) =>
                                    setAudienceForm((prev) => ({ ...prev, hook: e.target.value }))
                                  }
                                  disabled={savingAudience}
                                  rows={2}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                  Framing
                                </Label>
                                <textarea
                                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                  value={audienceForm.framing}
                                  onChange={(e) =>
                                    setAudienceForm((prev) => ({ ...prev, framing: e.target.value }))
                                  }
                                  disabled={savingAudience}
                                  rows={3}
                                />
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                    Key Statistic
                                  </Label>
                                  <Input
                                    value={audienceForm.key_stat}
                                    onChange={(e) =>
                                      setAudienceForm((prev) => ({ ...prev, key_stat: e.target.value }))
                                    }
                                    disabled={savingAudience}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                    Tone
                                  </Label>
                                  <Input
                                    value={audienceForm.tone}
                                    onChange={(e) =>
                                      setAudienceForm((prev) => ({ ...prev, tone: e.target.value }))
                                    }
                                    disabled={savingAudience}
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                  Call to Action
                                </Label>
                                <textarea
                                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                  value={audienceForm.call_to_action}
                                  onChange={(e) =>
                                    setAudienceForm((prev) => ({ ...prev, call_to_action: e.target.value }))
                                  }
                                  disabled={savingAudience}
                                  rows={2}
                                />
                              </div>
                              <div className="flex items-center gap-2 pt-2">
                                <Button
                                  size="sm"
                                  onClick={saveAudience}
                                  disabled={savingAudience}
                                >
                                  {savingAudience ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Save className="h-3.5 w-3.5" />
                                  )}
                                  {savingAudience ? "Saving..." : "Save"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={cancelEditAudience}
                                  disabled={savingAudience}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3">
                              <div className="flex justify-end mb-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-foreground"
                                  onClick={() => startEditAudience(aud)}
                                >
                                  <Pencil className="h-3.5 w-3.5 mr-1" />
                                  Edit
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                                    Hook
                                  </p>
                                  <p className="text-sm leading-relaxed">{narrative.hook}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                                    Framing
                                  </p>
                                  <p className="text-sm leading-relaxed">{narrative.framing}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                                    Key Statistic
                                  </p>
                                  <p className="text-sm leading-relaxed">{narrative.key_stat}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                                    Call to Action
                                  </p>
                                  <p className="text-sm leading-relaxed">
                                    {narrative.call_to_action}
                                  </p>
                                </div>
                                <div className="sm:col-span-2">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                                    Tone
                                  </p>
                                  <Badge variant="secondary" className="text-xs">
                                    {narrative.tone}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          )}
                        </TabsContent>
                      )
                    )}
                  </Tabs>
                </CardContent>
              </Card>
            )}

          {/* Analysis Meta */}
          {analysis && (
            <p className="text-xs text-muted-foreground">
              Generated{" "}
              {analysis.analyzed_at ? formatDate(analysis.analyzed_at) : "--"}{" "}
              {analysis.model_version && (
                <>
                  with{" "}
                  <span className="font-mono">{analysis.model_version}</span>
                </>
              )}
              {analysis.prompt_version && (
                <>
                  {" "}(prompt {analysis.prompt_version})
                </>
              )}
            </p>
          )}

          {/* Regenerate Config Form */}
          {showRegenerateConfig && (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10">
              <CardContent className="pt-6 space-y-5">
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="h-5 w-5 text-amber-600" />
                  <p className="text-sm font-medium">
                    Regenerate Strategy
                  </p>
                </div>
                <p className="text-xs text-muted-foreground -mt-3">
                  Adjust audiences, channels, and model below, then click Regenerate.
                </p>

                {renderSelectionForm("regen")}

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setShowRegenerateConfig(false);
                      handleGenerateStrategy();
                    }}
                    disabled={isGenerateDisabled}
                  >
                    {generating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {generating ? "Regenerating..." : "Regenerate Strategy"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowRegenerateConfig(false)}
                    disabled={generating}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* No Strategy — Generation Form */
        <Card className="border-dashed">
          <CardContent className="pt-6 space-y-5">
            <div className="text-center mb-2">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Add your documents above, then generate a campaign strategy.
              </p>
            </div>

            {renderSelectionForm("gen")}

            <div className="flex justify-center pt-2">
              <Button
                onClick={handleGenerateStrategy}
                disabled={isGenerateDisabled}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {generating ? "Generating..." : "Generate Strategy"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SSE Generation Log */}
      <div className="mt-6">
        <SSEGenerationLog
          title="Strategy Generation"
          entries={generationLog}
          isRunning={generating}
          expanded={logExpanded}
          onToggleExpanded={() => setLogExpanded(!logExpanded)}
          variant="card"
        />
      </div>
    </section>
  );
}
