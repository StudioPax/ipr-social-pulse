// @component CampaignPromptTab — Prompt generation + JSON import
"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Check,
  Loader2,
  Sparkles,
  AlertTriangle,
  Copy,
  ClipboardCheck,
  Upload,
} from "lucide-react";
import {
  CAMPAIGN_STAGES,
  CAMPAIGN_TYPES,
  CAMPAIGN_DURATIONS,
  CAMPAIGN_CHANNELS,
  TARGET_AUDIENCES,
} from "@/lib/tokens";
import type {
  Campaign,
  CampaignDocument,
  StrategyOutput,
  SSELogEntry,
  ImportPreview,
} from "./types";
import { getChannelLabel, getAudienceLabel } from "./helpers";
import { SSEGenerationLog } from "./sse-generation-log";

interface CampaignPromptTabProps {
  campaignId: string;
  campaign: Campaign;
  includedDocs: CampaignDocument[];
  strategyOutput: StrategyOutput | null;
  existingDeliverableCount: number;
  onRefresh: () => Promise<void>;
}

export function CampaignPromptTab({
  campaignId,
  campaign,
  includedDocs,
  existingDeliverableCount,
  onRefresh,
}: CampaignPromptTabProps) {
  const { toast } = useToast();

  // Config dialog state
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [configCampaignType, setConfigCampaignType] = useState(campaign.campaign_type || "new_research");
  const [configDurationWeeks, setConfigDurationWeeks] = useState(campaign.duration_weeks || 6);
  const [configChannels, setConfigChannels] = useState<string[]>(campaign.channels_used || []);
  const [configAudiences, setConfigAudiences] = useState<string[]>(campaign.target_audiences || []);
  const [savingConfig, setSavingConfig] = useState(false);

  // Prompt state
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [promptLog, setPromptLog] = useState<SSELogEntry[]>([]);
  const [promptLogExpanded, setPromptLogExpanded] = useState(false);

  // Import state
  const [importJson, setImportJson] = useState("");
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importErrors, setImportErrors] = useState<Array<{ field: string; message: string }>>([]);
  const [importing, setImporting] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);

  const toggleConfigChannel = useCallback((channel: string) => {
    setConfigChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  }, []);

  const toggleConfigAudience = useCallback((audience: string) => {
    setConfigAudiences((prev) =>
      prev.includes(audience) ? prev.filter((a) => a !== audience) : [...prev, audience]
    );
  }, []);

  const selectedTypeInfo = CAMPAIGN_TYPES.find((t) => t.value === configCampaignType);

  const handleOpenConfigDialog = () => {
    // Reset form to current campaign values each time
    setConfigCampaignType(campaign.campaign_type || "new_research");
    setConfigDurationWeeks(campaign.duration_weeks || 6);
    setConfigChannels(campaign.channels_used || []);
    setConfigAudiences(campaign.target_audiences || []);
    setShowConfigDialog(true);
  };

  const handleConfigGenerate = async () => {
    setSavingConfig(true);
    try {
      // Save updated campaign fields
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_type: configCampaignType,
          duration_weeks: configDurationWeeks,
          channels_used: configChannels,
          target_audiences: configAudiences,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to save settings" }));
        throw new Error(err.error || "Failed to save settings");
      }
      // Refresh parent so campaign data is up to date
      await onRefresh();
      setShowConfigDialog(false);
      // Now generate the prompt
      handleGeneratePrompt();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to save settings" });
    } finally {
      setSavingConfig(false);
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleGeneratePrompt = async () => {
    setGeneratingPrompt(true);
    setGeneratedPrompt(null);
    setPromptLog([]);
    setPromptLogExpanded(false);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/generate-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: campaign.client_id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to generate prompt" }));
        const errorMsg = err.error || "Failed to generate prompt";
        setPromptLog([{ level: "error", message: errorMsg, timestamp: new Date().toISOString() }]);
        toast({ title: "Error", description: errorMsg });
        setGeneratingPrompt(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setPromptLog([{ level: "error", message: "No response stream", timestamp: new Date().toISOString() }]);
        toast({ title: "Error", description: "No response stream" });
        setGeneratingPrompt(false);
        return;
      }

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
              setPromptLog((prev) => [...prev, entry]);

              if (entry.level === "done") {
                const prompt = entry.prompt as string;
                const version = entry.version as string;
                const stats = entry.stats as { documents: number; words: number; has_strategy: boolean };
                setGeneratedPrompt(prompt);
                toast({
                  title: "Prompt generated",
                  description: `Version ${version} — ${stats.documents} docs, ~${stats.words.toLocaleString()} words`,
                });
              }

              if (entry.level === "error") {
                toast({ title: "Error", description: entry.message });
              }
            } catch {
              // Ignore JSON parse errors
            }
          }
        }
      }
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to generate prompt" });
    } finally {
      setGeneratingPrompt(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!generatedPrompt) return;
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
      toast({ title: "Copied", description: "Prompt copied to clipboard" });
    } catch {
      toast({ title: "Error", description: "Failed to copy to clipboard" });
    }
  };

  const handleValidateImport = async () => {
    setImporting(true);
    setImportPreview(null);
    setImportErrors([]);
    try {
      const parsed = JSON.parse(importJson);
      const res = await fetch(`/api/campaigns/${campaignId}/import?preview=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: parsed }),
      });
      const data = await res.json();
      if (!res.ok || data.valid === false) {
        setImportErrors(data.errors || [{ field: "root", message: data.error || "Validation failed" }]);
      } else {
        setImportPreview(data);
      }
    } catch (err) {
      setImportErrors([{ field: "root", message: err instanceof Error ? err.message : "Invalid JSON" }]);
    } finally {
      setImporting(false);
    }
  };

  const handleCommitImport = async () => {
    setCommitting(true);
    try {
      const parsed = JSON.parse(importJson);
      const res = await fetch(`/api/campaigns/${campaignId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: parsed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Import failed");
      }
      toast({ title: "Import complete", description: `${data.deliverables_created} deliverables imported` });
      setImportJson("");
      setImportPreview(null);
      setImportErrors([]);
      await onRefresh();
    } catch (err) {
      toast({ title: "Import failed", description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setCommitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <section>
      <h2 className="font-display text-xl mb-4">Generate & Import</h2>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column — Generate Prompt */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Generate Campaign Prompt</CardTitle>
            <p className="text-xs text-muted-foreground">
              Build a prompt from your campaign metadata, documents, and strategy. Copy it into Claude App to generate your campaign calendar.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleOpenConfigDialog}
              disabled={generatingPrompt || includedDocs.length === 0}
              className="w-full"
            >
              {generatingPrompt ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generatingPrompt ? "Generating..." : "Generate Campaign Prompt"}
            </Button>

            {includedDocs.length === 0 && (
              <p className="text-xs text-center text-muted-foreground">
                Include at least one document above to generate a prompt.
              </p>
            )}

            {/* SSE log bar for prompt generation */}
            <SSEGenerationLog
              title="Prompt Generation"
              entries={promptLog}
              isRunning={generatingPrompt}
              expanded={promptLogExpanded}
              onToggleExpanded={() => setPromptLogExpanded(!promptLogExpanded)}
              variant="inline"
            />

            {generatedPrompt && (
              <>
                <div className="relative">
                  <pre className="max-h-[400px] overflow-y-auto rounded-md border bg-muted/50 p-4 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                    {generatedPrompt}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleCopyPrompt}
                  >
                    {promptCopied ? (
                      <ClipboardCheck className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {promptCopied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                  Copy this prompt into Claude App (with campaign blueprints) to generate the import JSON.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right Column — Import JSON */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Import JSON</CardTitle>
            <p className="text-xs text-muted-foreground">
              Paste the JSON output from Claude App to import deliverables into your campaign calendar.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              className="flex min-h-[160px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder='Paste JSON here...\n{\n  "campaign_type": "new_research",\n  "channels_used": [...],\n  "deliverables": [...]\n}'
              value={importJson}
              onChange={(e) => {
                setImportJson(e.target.value);
                if (importPreview) setImportPreview(null);
                if (importErrors.length > 0) setImportErrors([]);
              }}
              disabled={importing || committing}
              rows={8}
            />

            <Button
              onClick={handleValidateImport}
              disabled={importing || committing || !importJson.trim()}
              variant="outline"
              className="w-full"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {importing ? "Validating..." : "Validate & Preview"}
            </Button>

            {/* Validation Errors */}
            {importErrors.length > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                <p className="text-xs font-medium text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Validation Failed
                </p>
                <ul className="text-xs text-destructive/90 space-y-0.5 ml-5 list-disc">
                  {importErrors.map((err, i) => (
                    <li key={i}>
                      <span className="font-mono text-[10px]">{err.field}</span>: {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Import Preview */}
            {importPreview && (
              <div className="rounded-md border bg-muted/30 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <p className="text-sm font-medium">
                    Valid JSON — {importPreview.summary.total_deliverables} deliverables
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {importPreview.summary.channels.map((ch) => (
                    <Badge key={ch} variant="secondary" className="text-[10px]">
                      {getChannelLabel(ch)}
                    </Badge>
                  ))}
                  <span className="text-muted-foreground text-[10px] px-1">&middot;</span>
                  {importPreview.summary.stages.map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px]">
                      {CAMPAIGN_STAGES.find((st) => st.value === s)?.label || s}
                    </Badge>
                  ))}
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-3">
                  {Array.from(new Set(importPreview.deliverables.map((d) => d.week_number)))
                    .sort((a, b) => a - b)
                    .map((week) => {
                      const weekDeliverables = importPreview.deliverables.filter(
                        (d) => d.week_number === week
                      );
                      const stage = weekDeliverables[0]?.stage || "";
                      return (
                        <div key={week}>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Week {week}{" "}
                            <span className="font-normal">
                              ({CAMPAIGN_STAGES.find((s) => s.value === stage)?.label || stage})
                            </span>
                          </p>
                          <div className="space-y-1">
                            {weekDeliverables.map((del) => (
                              <div
                                key={del.index}
                                className="flex items-start gap-2 text-[11px] py-1 px-2 rounded bg-background border"
                              >
                                <span className="font-medium min-w-[70px]">
                                  {getChannelLabel(del.channel)}
                                </span>
                                <span className="text-muted-foreground min-w-[80px]">
                                  {getAudienceLabel(del.audience_segment)}
                                </span>
                                <span className="text-muted-foreground truncate flex-1">
                                  {del.suggested_content_preview}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>

                <Button
                  onClick={() => {
                    if (existingDeliverableCount > 0) {
                      setShowImportConfirm(true);
                    } else {
                      handleCommitImport();
                    }
                  }}
                  disabled={committing}
                  className="w-full"
                >
                  {committing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {committing
                    ? "Importing..."
                    : `Confirm Import — ${importPreview.summary.total_deliverables} deliverables`}
                </Button>
                {existingDeliverableCount > 0 && (
                  <p className="text-[11px] text-amber-600 text-center">
                    This will replace all {existingDeliverableCount} existing deliverables for this campaign.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Import confirmation dialog when existing deliverables exist */}
      <AlertDialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace existing deliverables?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {existingDeliverableCount} existing
              deliverables from the Campaign Plan and replace them with{" "}
              {importPreview?.summary.total_deliverables ?? 0} new ones from this import.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowImportConfirm(false);
                handleCommitImport();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete & Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Campaign config dialog — shown before prompt generation */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Campaign Prompt Settings</DialogTitle>
            <DialogDescription>
              Confirm or update campaign parameters before generating the prompt.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Campaign Type + Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="config-campaign-type">Campaign Type</Label>
                <Select
                  value={configCampaignType}
                  onValueChange={setConfigCampaignType}
                  disabled={savingConfig}
                >
                  <SelectTrigger id="config-campaign-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="config-duration">Duration</Label>
                <Select
                  value={String(configDurationWeeks)}
                  onValueChange={(v) => setConfigDurationWeeks(Number(v))}
                  disabled={savingConfig}
                >
                  <SelectTrigger id="config-duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_DURATIONS.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedTypeInfo && (
              <p className="text-[11px] text-muted-foreground -mt-2">
                {selectedTypeInfo.description}
              </p>
            )}

            {/* Channels */}
            <div className="grid gap-2">
              <Label>Channels</Label>
              <div className="flex flex-wrap gap-2">
                {CAMPAIGN_CHANNELS.map((ch) => (
                  <button
                    key={ch.value}
                    type="button"
                    onClick={() => toggleConfigChannel(ch.value)}
                    disabled={savingConfig}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      configChannels.includes(ch.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Select channels for this campaign. Leave empty for auto-mix.
              </p>
            </div>

            {/* Target Audiences */}
            <div className="grid gap-2">
              <Label>Target Audiences</Label>
              <div className="flex flex-wrap gap-2">
                {TARGET_AUDIENCES.map((aud) => (
                  <button
                    key={aud.value}
                    type="button"
                    onClick={() => toggleConfigAudience(aud.value)}
                    disabled={savingConfig}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      configAudiences.includes(aud.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {aud.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfigDialog(false)}
              disabled={savingConfig}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfigGenerate}
              disabled={savingConfig}
            >
              {savingConfig ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {savingConfig ? "Saving..." : "Generate Prompt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
