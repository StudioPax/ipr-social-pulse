// @component CampaignChannelsTab — Week-grouped channel plan table with inline editing
"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  CAMPAIGN_CHANNELS,
  TARGET_AUDIENCES,
  CHANNEL_STATUSES,
  CAMPAIGN_STAGES,
} from "@/lib/tokens";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Plus,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  Calendar,
  Hash,
  Pencil,
  Save,
  Sparkles,
  FileText,
} from "lucide-react";
import type { CampaignChannel, StrategyOutput, ChannelEditForm, WeeklyObjective } from "./types";
import {
  CHANNEL_STATUS_COLORS,
  formatDate,
  formatNumber,
  getChannelLabel,
  getAudienceLabel,
  getChannelCharLimit,
  buildDeliverableCopyText,
} from "./helpers";

interface CampaignChannelsTabProps {
  campaignId: string;
  clientId: string;
  durationWeeks: number | null;
  channels: CampaignChannel[];
  strategyOutput: StrategyOutput | null;
  onRefresh: () => Promise<void>;
}

export function CampaignChannelsTab({
  campaignId,
  clientId,
  durationWeeks,
  channels,
  strategyOutput,
  onRefresh,
}: CampaignChannelsTabProps) {
  const { toast } = useToast();

  // Channel expansion state
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());

  // Channel edit state
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [channelEditForm, setChannelEditForm] = useState<ChannelEditForm>({
    content: "",
    status: "planned",
    hashtags: "",
    mentions: "",
    media_suggestion: "",
  });
  const [savingChannel, setSavingChannel] = useState(false);

  // Weekly objective editing state
  const [editingWeek, setEditingWeek] = useState<number | null>(null);
  const [weekObjectiveText, setWeekObjectiveText] = useState("");
  const [savingObjective, setSavingObjective] = useState(false);

  // Add channel deliverable state
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannelType, setNewChannelType] = useState("");
  const [newChannelAudience, setNewChannelAudience] = useState("");
  const [newChannelStage, setNewChannelStage] = useState("rollout");
  const [newChannelWeek, setNewChannelWeek] = useState("");
  const [newChannelContent, setNewChannelContent] = useState("");
  const [contentMode, setContentMode] = useState<"manual" | "ai">("manual");
  const [addingChannel, setAddingChannel] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────

  const toggleChannelExpanded = (channelId: string) => {
    setExpandedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) next.delete(channelId);
      else next.add(channelId);
      return next;
    });
  };

  const startEditChannel = (ch: CampaignChannel) => {
    const content = ch.edited_content || ch.suggested_content || "";
    setChannelEditForm({
      content,
      status: ch.status,
      hashtags: (ch.hashtags || []).join(", "),
      mentions: (ch.mentions || []).join(", "),
      media_suggestion: ch.media_suggestion || "",
    });
    setEditingChannelId(ch.id);
    setExpandedChannels((prev) => {
      const next = new Set(prev);
      next.add(ch.id);
      return next;
    });
  };

  const cancelEditChannel = () => {
    setEditingChannelId(null);
  };

  const saveChannel = async (ch: CampaignChannel) => {
    setSavingChannel(true);
    try {
      const hashtagArr = channelEditForm.hashtags
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter((t) => t.length > 0);
      const mentionArr = channelEditForm.mentions
        .split(",")
        .map((m) => m.trim().replace(/^@/, ""))
        .filter((m) => m.length > 0);

      const originalContent = ch.edited_content || ch.suggested_content || "";
      const contentChanged = channelEditForm.content !== originalContent;
      let newStatus = channelEditForm.status;
      if (contentChanged && ch.status === "planned" && newStatus === "planned") {
        newStatus = "drafted";
      }

      const body: Record<string, unknown> = {
        edited_content: channelEditForm.content || null,
        char_count: channelEditForm.content.length,
        status: newStatus,
        hashtags: hashtagArr.length > 0 ? hashtagArr : null,
        mentions: mentionArr.length > 0 ? mentionArr : null,
        media_suggestion: channelEditForm.media_suggestion.trim() || null,
      };

      const res = await fetch(
        `/api/campaigns/${campaignId}/channels/${ch.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error("Failed to update channel");

      toast({
        title: "Channel updated",
        description: `${getChannelLabel(ch.channel)} content saved.`,
      });
      setEditingChannelId(null);
      await onRefresh();
    } catch {
      toast({ title: "Error", description: "Failed to save channel changes." });
    } finally {
      setSavingChannel(false);
    }
  };

  const quickStatusChange = async (ch: CampaignChannel, newStatus: string) => {
    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/channels/${ch.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (!res.ok) throw new Error("Failed to update status");
      await onRefresh();
    } catch {
      toast({ title: "Error", description: "Failed to update channel status." });
    }
  };

  const quickStageChange = async (ch: CampaignChannel, newStage: string) => {
    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/channels/${ch.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: newStage }),
        }
      );
      if (!res.ok) throw new Error("Failed to update stage");
      await onRefresh();
    } catch {
      toast({ title: "Error", description: "Failed to update channel stage." });
    }
  };

  const addChannelDeliverable = async () => {
    if (!newChannelType || !newChannelAudience) return;
    const weekNum = newChannelWeek ? parseInt(newChannelWeek, 10) : null;

    setAddingChannel(true);
    try {
      if (contentMode === "ai") {
        // AI generate mode — requires week_number
        if (!weekNum) {
          toast({ title: "Week required", description: "Select a week for AI-generated content." });
          setAddingChannel(false);
          return;
        }
        const res = await fetch(`/api/campaigns/${campaignId}/generate-deliverable`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: clientId,
            channel: newChannelType,
            audience_segment: newChannelAudience,
            stage: newChannelStage,
            week_number: weekNum,
            ...(newChannelContent.trim() && { user_direction: newChannelContent.trim() }),
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to generate deliverable");
        }
        toast({
          title: "Deliverable generated",
          description: `AI-generated ${getChannelLabel(newChannelType)} content for Week ${weekNum}.`,
        });
      } else {
        // Manual mode
        const res = await fetch(`/api/campaigns/${campaignId}/channels`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: newChannelType,
            audience_segment: newChannelAudience,
            stage: newChannelStage,
            week_number: weekNum,
            suggested_content: newChannelContent.trim() || null,
            status: "planned",
          }),
        });
        if (!res.ok) throw new Error("Failed to add channel deliverable");
        toast({
          title: "Deliverable added",
          description: `${getChannelLabel(newChannelType)} deliverable has been added.`,
        });
      }

      setNewChannelType("");
      setNewChannelAudience("");
      setNewChannelStage("rollout");
      setNewChannelWeek("");
      setNewChannelContent("");
      setContentMode("manual");
      setShowAddChannel(false);
      await onRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add deliverable.";
      toast({ title: "Error", description: message });
    } finally {
      setAddingChannel(false);
    }
  };

  // Weekly objective helpers
  const weeklyObjectives: WeeklyObjective[] = strategyOutput?.weekly_objectives || [];

  const getWeekObjective = (weekNum: number | null): string | undefined => {
    if (weekNum == null) return undefined;
    return weeklyObjectives.find((o) => o.week_number === weekNum)?.objective;
  };

  const startEditObjective = (weekNum: number, currentText: string) => {
    setEditingWeek(weekNum);
    setWeekObjectiveText(currentText);
  };

  const saveObjective = async (weekNum: number) => {
    setSavingObjective(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/weekly-objectives`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_number: weekNum, objective: weekObjectiveText }),
      });
      if (!res.ok) throw new Error("Failed to save objective");
      toast({ title: "Objective updated", description: `Week ${weekNum} objective saved.` });
      setEditingWeek(null);
      await onRefresh();
    } catch {
      toast({ title: "Error", description: "Failed to save weekly objective." });
    } finally {
      setSavingObjective(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <section>
      <h2 className="font-display text-xl mb-4">
        Campaign Plan
        {channels.length > 0 && (
          <span className="text-sm font-normal text-muted-foreground ml-2">
            {channels.length} deliverable{channels.length !== 1 ? "s" : ""}
          </span>
        )}
      </h2>

      {channels.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Hash className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>
              {strategyOutput
                ? "No campaign plans created yet. Use Generate & Import above to generate deliverables."
                : "Campaign plans will be generated with the campaign strategy, or via Generate & Import."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Group channels by week_number */}
          {(() => {
            const weekMap = new Map<number | null, CampaignChannel[]>();
            for (const ch of channels) {
              const wk = ch.week_number;
              if (!weekMap.has(wk)) weekMap.set(wk, []);
              weekMap.get(wk)!.push(ch);
            }
            const weekKeys = Array.from(weekMap.keys()).sort((a, b) => {
              if (a === null) return 1;
              if (b === null) return -1;
              return a - b;
            });

            return weekKeys.map((weekNum) => {
              const weekChannels = weekMap.get(weekNum)!;
              const weekStage = weekChannels[0]?.stage || "rollout";
              const stageLabel = CAMPAIGN_STAGES.find((s) => s.value === weekStage)?.label || weekStage;

              return (
                <Card key={weekNum ?? "unscheduled"} className="mb-4">
                  {/* Week header */}
                  <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">
                      {weekNum != null ? `Week ${weekNum}` : "Unscheduled"}
                    </h3>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        weekStage === "pre_launch"
                          ? "bg-purple-100 text-purple-800"
                          : weekStage === "sustain"
                          ? "bg-green-100 text-green-800"
                          : weekStage === "measure"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      )}
                    >
                      {stageLabel}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {weekChannels.length} item{weekChannels.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Weekly objective */}
                  {weekNum != null && (() => {
                    const objectiveText = getWeekObjective(weekNum);
                    const isEditingThis = editingWeek === weekNum;

                    if (isEditingThis) {
                      return (
                        <div className="px-4 py-3 border-b bg-muted/10">
                          <textarea
                            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={weekObjectiveText}
                            onChange={(e) => setWeekObjectiveText(e.target.value)}
                            disabled={savingObjective}
                            placeholder={`Week ${weekNum} objective...`}
                            rows={2}
                          />
                          <div className="flex items-center justify-end gap-2 mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingWeek(null)}
                              disabled={savingObjective}
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => saveObjective(weekNum)}
                              disabled={savingObjective}
                            >
                              {savingObjective ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                              ) : (
                                <Save className="h-3.5 w-3.5 mr-1" />
                              )}
                              {savingObjective ? "Saving..." : "Save"}
                            </Button>
                          </div>
                        </div>
                      );
                    }

                    if (objectiveText) {
                      return (
                        <div
                          className="px-4 py-2.5 border-b bg-muted/10 flex items-start gap-2 group cursor-pointer hover:bg-muted/20 transition-colors"
                          onClick={() => startEditObjective(weekNum, objectiveText)}
                        >
                          <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                            {objectiveText}
                          </p>
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors shrink-0 mt-0.5" />
                        </div>
                      );
                    }

                    // Empty state — clickable placeholder
                    return (
                      <div
                        className="px-4 py-2 border-b border-dashed border-border/50 flex items-center gap-2 group cursor-pointer hover:bg-muted/10 transition-colors"
                        onClick={() => startEditObjective(weekNum, "")}
                      >
                        <p className="text-xs text-muted-foreground/50 italic group-hover:text-muted-foreground/80 transition-colors">
                          + Add weekly objective…
                        </p>
                      </div>
                    );
                  })()}

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8" />
                        <TableHead>Channel</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Audience</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead className="text-right">Chars</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weekChannels.map((ch) => {
                        const isExpanded = expandedChannels.has(ch.id);
                        const content = ch.edited_content || ch.suggested_content;
                        const isEditing = editingChannelId === ch.id;
                        return (
                          <React.Fragment key={ch.id}>
                            {/* Summary row */}
                            <TableRow
                              className="cursor-pointer"
                              onClick={() => {
                                if (isEditing) return;
                                toggleChannelExpanded(ch.id);
                              }}
                            >
                              <TableCell>
                                {(content || isEditing) ? (
                                  isExpanded ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )
                                ) : null}
                              </TableCell>
                              <TableCell className="font-medium">
                                {getChannelLabel(ch.channel)}
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Select
                                  value={ch.stage || "rollout"}
                                  onValueChange={(v) => quickStageChange(ch, v)}
                                >
                                  <SelectTrigger className="h-7 w-[100px] text-[11px] px-2 py-0 border-0 shadow-none">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-[10px]",
                                        ch.stage === "sustain"
                                          ? "bg-green-100 text-green-800"
                                          : ch.stage === "measure"
                                          ? "bg-amber-100 text-amber-800"
                                          : ch.stage === "pre_launch"
                                          ? "bg-purple-100 text-purple-800"
                                          : "bg-blue-100 text-blue-800"
                                      )}
                                    >
                                      {(CAMPAIGN_STAGES.find((s) => s.value === (ch.stage || "rollout"))?.label) || ch.stage}
                                    </Badge>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CAMPAIGN_STAGES.map((s) => (
                                      <SelectItem key={s.value} value={s.value} className="text-xs">
                                        {s.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-sm">
                                {getAudienceLabel(ch.audience_segment)}
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Select
                                  value={ch.status}
                                  onValueChange={(v) => quickStatusChange(ch, v)}
                                >
                                  <SelectTrigger className="h-7 w-[110px] text-[11px] px-2 py-0 border-0 shadow-none">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-[10px]",
                                        CHANNEL_STATUS_COLORS[ch.status] || ""
                                      )}
                                    >
                                      {ch.status}
                                    </Badge>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CHANNEL_STATUSES.map((s) => (
                                      <SelectItem key={s} value={s} className="text-xs">
                                        {s}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {ch.scheduled_date ? formatDate(ch.scheduled_date) : "--"}
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums text-sm">
                                {ch.char_count != null ? formatNumber(ch.char_count) : "--"}
                              </TableCell>
                            </TableRow>

                            {/* Expanded row — Display mode */}
                            {isExpanded && content && !isEditing && (
                              <TableRow>
                                <TableCell colSpan={7} className="bg-muted/30">
                                  <div className="px-2 py-3 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-sm whitespace-pre-wrap leading-relaxed flex-1">
                                        {content}
                                      </p>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <CopyButton
                                          text={buildDeliverableCopyText(ch)}
                                          label="Copy"
                                          toastDescription={`${getChannelLabel(ch.channel)} content copied`}
                                          charCount={buildDeliverableCopyText(ch).length}
                                          charLimit={getChannelCharLimit(ch.channel)}
                                        />
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-muted-foreground hover:text-foreground"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startEditChannel(ch);
                                          }}
                                        >
                                          <Pencil className="h-3.5 w-3.5 mr-1" />
                                          Edit
                                        </Button>
                                      </div>
                                    </div>
                                    {ch.hashtags && ch.hashtags.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {ch.hashtags.map((tag, i) => (
                                          <Badge key={i} variant="secondary" className="text-[10px]">
                                            #{tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                    {ch.mentions && ch.mentions.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {ch.mentions.map((m, i) => (
                                          <Badge key={i} variant="outline" className="text-[10px]">
                                            @{m}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                    {ch.media_suggestion && (
                                      <p className="text-xs text-muted-foreground">
                                        <span className="font-medium">Media suggestion:</span>{" "}
                                        {ch.media_suggestion}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}

                            {/* Expanded row — Edit mode */}
                            {isExpanded && isEditing && (
                              <TableRow>
                                <TableCell colSpan={7} className="bg-muted/30">
                                  <div className="px-2 py-3 space-y-4">
                                    <div className="space-y-1.5">
                                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                        Content
                                      </Label>
                                      <textarea
                                        className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        value={channelEditForm.content}
                                        onChange={(e) =>
                                          setChannelEditForm((prev) => ({
                                            ...prev,
                                            content: e.target.value,
                                          }))
                                        }
                                        disabled={savingChannel}
                                        placeholder="Enter post content..."
                                      />
                                      {(() => {
                                        const charLimit = getChannelCharLimit(ch.channel);
                                        const count = channelEditForm.content.length;
                                        if (charLimit === null) {
                                          return (
                                            <p className="text-xs text-muted-foreground text-right font-mono tabular-nums">
                                              {count} chars
                                            </p>
                                          );
                                        }
                                        const pct = count / charLimit;
                                        return (
                                          <p
                                            className={cn(
                                              "text-xs text-right font-mono tabular-nums",
                                              pct > 1
                                                ? "text-destructive font-semibold"
                                                : pct > 0.9
                                                ? "text-amber-600"
                                                : "text-muted-foreground"
                                            )}
                                          >
                                            {count} / {charLimit}
                                            {pct > 1 && " (over limit!)"}
                                            {pct > 0.9 && pct <= 1 && " (approaching limit)"}
                                          </p>
                                        );
                                      })()}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                      <div className="space-y-1.5">
                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                          Status
                                        </Label>
                                        <Select
                                          value={channelEditForm.status}
                                          onValueChange={(v) =>
                                            setChannelEditForm((prev) => ({ ...prev, status: v }))
                                          }
                                          disabled={savingChannel}
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {CHANNEL_STATUSES.map((s) => (
                                              <SelectItem key={s} value={s}>
                                                {s}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-1.5">
                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                          Hashtags
                                        </Label>
                                        <Input
                                          placeholder="health, IPR, policy"
                                          value={channelEditForm.hashtags}
                                          onChange={(e) =>
                                            setChannelEditForm((prev) => ({
                                              ...prev,
                                              hashtags: e.target.value,
                                            }))
                                          }
                                          disabled={savingChannel}
                                        />
                                        <p className="text-[10px] text-muted-foreground">
                                          Comma-separated, without #
                                        </p>
                                      </div>
                                      <div className="space-y-1.5">
                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                          Mentions
                                        </Label>
                                        <Input
                                          placeholder="NorthwesternIPR, user123"
                                          value={channelEditForm.mentions}
                                          onChange={(e) =>
                                            setChannelEditForm((prev) => ({
                                              ...prev,
                                              mentions: e.target.value,
                                            }))
                                          }
                                          disabled={savingChannel}
                                        />
                                        <p className="text-[10px] text-muted-foreground">
                                          Comma-separated, without @
                                        </p>
                                      </div>
                                    </div>

                                    <div className="space-y-1.5">
                                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                        Media Suggestion
                                      </Label>
                                      <Input
                                        placeholder="e.g. Infographic with key stat, researcher headshot"
                                        value={channelEditForm.media_suggestion}
                                        onChange={(e) =>
                                          setChannelEditForm((prev) => ({
                                            ...prev,
                                            media_suggestion: e.target.value,
                                          }))
                                        }
                                        disabled={savingChannel}
                                      />
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={cancelEditChannel}
                                        disabled={savingChannel}
                                      >
                                        <X className="h-3.5 w-3.5 mr-1" />
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => saveChannel(ch)}
                                        disabled={savingChannel}
                                      >
                                        {savingChannel ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                        ) : (
                                          <Save className="h-3.5 w-3.5 mr-1" />
                                        )}
                                        {savingChannel ? "Saving..." : "Save"}
                                      </Button>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              );
            });
          })()}
        </>
      )}

      {/* Add Deliverable */}
      {strategyOutput && (
        <div className="mt-4">
          {showAddChannel ? (
            <Card className="border-dashed">
              <CardContent className="pt-6 space-y-4">
                <p className="text-sm font-medium">Add New Deliverable</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Channel
                    </Label>
                    <Select value={newChannelType} onValueChange={setNewChannelType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select channel..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMPAIGN_CHANNELS.map((ch) => (
                          <SelectItem key={ch.value} value={ch.value} className="text-xs">
                            {ch.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Audience
                    </Label>
                    <Select value={newChannelAudience} onValueChange={setNewChannelAudience}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select audience..." />
                      </SelectTrigger>
                      <SelectContent>
                        {TARGET_AUDIENCES.map((a) => (
                          <SelectItem key={a.value} value={a.value} className="text-xs">
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Week
                    </Label>
                    <Select value={newChannelWeek} onValueChange={setNewChannelWeek}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select week..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from(
                          { length: durationWeeks || 6 },
                          (_, i) => i + 1
                        ).map((w) => {
                          const obj = weeklyObjectives.find((o) => o.week_number === w);
                          return (
                            <SelectItem key={w} value={String(w)} className="text-xs">
                              Week {w}
                              {obj ? ` — ${obj.objective.slice(0, 40)}…` : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Stage
                    </Label>
                    <Select value={newChannelStage} onValueChange={setNewChannelStage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMPAIGN_STAGES.map((s) => (
                          <SelectItem key={s.value} value={s.value} className="text-xs">
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Content mode toggle */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Content
                    </Label>
                    <div className="flex items-center gap-1 ml-auto">
                      <Button
                        variant={contentMode === "manual" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 text-xs px-2.5"
                        onClick={() => setContentMode("manual")}
                        disabled={addingChannel}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Manual
                      </Button>
                      <Button
                        variant={contentMode === "ai" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 text-xs px-2.5"
                        onClick={() => setContentMode("ai")}
                        disabled={addingChannel}
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI Generate
                      </Button>
                    </div>
                  </div>

                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={newChannelContent}
                    onChange={(e) => setNewChannelContent(e.target.value)}
                    disabled={addingChannel}
                    placeholder={
                      contentMode === "ai"
                        ? "Optional: add direction, tone notes, or talking points for AI..."
                        : "Draft content for this deliverable..."
                    }
                    rows={3}
                  />

                  {contentMode === "ai" && (
                    <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2.5">
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <span>
                          AI will generate content using the{" "}
                          {newChannelWeek
                            ? `Week ${newChannelWeek} objective`
                            : "weekly objective"}
                          , channel constraints
                          {newChannelType
                            ? ` (${getChannelLabel(newChannelType)}${(() => {
                                const limit = getChannelCharLimit(newChannelType);
                                return limit ? `, ${limit} chars` : "";
                              })()})`
                            : ""}
                          , and campaign strategy.
                          {newChannelContent.trim()
                            ? " Your notes above will be included as additional direction."
                            : ""}
                        </span>
                      </div>
                      {!newChannelWeek && (
                        <p className="text-xs text-amber-600 mt-1.5 ml-5.5">
                          Select a week above — required for AI generation.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={addChannelDeliverable}
                    disabled={
                      addingChannel ||
                      !newChannelType ||
                      !newChannelAudience ||
                      (contentMode === "ai" && !newChannelWeek)
                    }
                  >
                    {addingChannel ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : contentMode === "ai" ? (
                      <Sparkles className="h-3.5 w-3.5" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    {addingChannel
                      ? contentMode === "ai"
                        ? "Generating..."
                        : "Adding..."
                      : contentMode === "ai"
                      ? "Generate Deliverable"
                      : "Add Deliverable"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddChannel(false);
                      setNewChannelType("");
                      setNewChannelAudience("");
                      setNewChannelStage("rollout");
                      setNewChannelWeek("");
                      setNewChannelContent("");
                      setContentMode("manual");
                    }}
                    disabled={addingChannel}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddChannel(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Deliverable
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
