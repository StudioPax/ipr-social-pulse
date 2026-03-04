// @page CampaignDetail — Single-page campaign brief view
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  DOCUMENT_ROLES,
  TARGET_AUDIENCES,
  CAMPAIGN_CHANNELS,
  CHANNEL_STATUSES,
  CAMPAIGN_STAGES,
  type DocumentRole,
} from "@/lib/tokens";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  FileText,
  Plus,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Loader2,
  Sparkles,
  Calendar,
  Users,
  Hash,
  Pencil,
  Save,
  RefreshCw,
  AlertTriangle,
  Copy,
  ClipboardCheck,
  Upload,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Campaign {
  id: string;
  client_id: string;
  title: string;
  status: string;
  campaign_type: string;
  duration_weeks: number | null;
  channels_used: string[];
  research_authors: string[] | null;
  research_doi: string | null;
  research_url: string | null;
  publication_date: string | null;
  embargo_until: string | null;
  target_audiences: string[] | null;
  pillar_tags: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ImportPreview {
  valid: boolean;
  summary: {
    total_deliverables: number;
    channels: string[];
    weeks: number[];
    stages: string[];
    audiences: string[];
  };
  deliverables: Array<{
    index: number;
    week_number: number;
    channel: string;
    audience_segment: string;
    stage: string;
    suggested_content_preview: string;
    status: string;
  }>;
}

interface SSELogEntry {
  level: string;
  message: string;
  timestamp?: string;
  [key: string]: unknown;
}

interface CampaignDocument {
  id: string;
  campaign_id: string;
  document_role: string;
  title: string;
  content_text: string | null;
  source: string | null;
  word_count: number | null;
  is_included: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface CampaignChannel {
  id: string;
  campaign_id: string;
  channel: string;
  audience_segment: string;
  suggested_content: string | null;
  edited_content: string | null;
  char_count: number | null;
  hashtags: string[] | null;
  mentions: string[] | null;
  media_suggestion: string | null;
  status: string;
  stage: string;
  week_number: number | null;
  scheduled_for: string | null;
  published_post_id: string | null;
  publish_order: number | null;
}

interface AudienceNarrative {
  hook: string;
  framing: string;
  key_stat: string;
  call_to_action: string;
  tone: string;
}

interface ChannelStrategy {
  rationale: string;
  best_audience: string;
  format: string;
  timing: string;
  priority: string;
  suggested_content: string;
  hashtags: string[];
  mentions: string[];
  media_suggestion: string;
}

interface StrategyOutput {
  research_summary: string;
  key_messages: string[];
  audience_narratives: Record<string, AudienceNarrative>;
  channel_strategy: Record<string, ChannelStrategy>;
  fw_values_lead: string;
  fw_causal_chain: string;
  fw_cultural_freight: string;
  fw_thematic_bridge: string;
  fw_solutions_framing: string;
}

interface CampaignAnalysis {
  id: string;
  campaign_id: string;
  research_summary: string | null;
  key_messages: string[] | null;
  audience_narratives: Record<string, AudienceNarrative> | null;
  channel_strategy: Record<string, ChannelStrategy> | null;
  fw_values_lead: string | null;
  fw_causal_chain: string | null;
  fw_cultural_freight: string | null;
  fw_thematic_bridge: string | null;
  fw_solutions_framing: string | null;
  model_version: string | null;
  prompt_version: string | null;
  analyzed_at: string | null;
}

interface CampaignData {
  campaign: Campaign;
  documents: CampaignDocument[];
  channels: CampaignChannel[];
  analysis: CampaignAnalysis | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLE_COLORS: Record<string, string> = {
  research_paper: "bg-blue-100 text-blue-800 border-blue-200",
  research_notes: "bg-amber-100 text-amber-800 border-amber-200",
  ai_brief: "bg-violet-100 text-violet-800 border-violet-200",
  supporting: "bg-slate-100 text-slate-700 border-slate-200",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  active: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  archived: "bg-red-100 text-red-700",
};

const CHANNEL_STATUS_COLORS: Record<string, string> = {
  planned: "bg-slate-100 text-slate-700",
  drafted: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  published: "bg-green-100 text-green-800",
  skipped: "bg-red-100 text-red-700",
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatNumber = (n: number): string => n.toLocaleString("en-US");

const getRoleLabel = (role: string): string => {
  const found = DOCUMENT_ROLES.find((r) => r.value === role);
  return found ? found.label : role;
};

const getChannelLabel = (channel: string): string => {
  const found = CAMPAIGN_CHANNELS.find((c) => c.value === channel);
  return found ? found.label : channel;
};

const getAudienceLabel = (audience: string): string => {
  const found = TARGET_AUDIENCES.find((a) => a.value === audience);
  return found ? found.label : audience;
};

const getChannelCharLimit = (channel: string): number | null => {
  const found = CAMPAIGN_CHANNELS.find((c) => c.value === channel);
  return found ? found.charLimit : null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.id as string;
  const { toast } = useToast();

  const [data, setData] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Document expansion state
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());

  // Channel expansion state
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());

  // Channel edit state
  interface ChannelEditForm {
    content: string;
    status: string;
    hashtags: string;
    mentions: string;
    media_suggestion: string;
  }
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [channelEditForm, setChannelEditForm] = useState<ChannelEditForm>({
    content: "",
    status: "planned",
    hashtags: "",
    mentions: "",
    media_suggestion: "",
  });
  const [savingChannel, setSavingChannel] = useState(false);

  // Add document form state
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocRole, setNewDocRole] = useState<DocumentRole>("research_paper");
  const [newDocContent, setNewDocContent] = useState("");
  const [addingDoc, setAddingDoc] = useState(false);

  // Strategy generation form state
  const [selectedAudiences, setSelectedAudiences] = useState<Set<string>>(new Set());
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [selectedModel, setSelectedModel] = useState("claude");

  // SSE generation state
  const [generating, setGenerating] = useState(false);
  const [generationLog, setGenerationLog] = useState<SSELogEntry[]>([]);
  const [generationType, setGenerationType] = useState<"brief" | "strategy" | null>(null);

  // Regenerate strategy state
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [showRegenerateConfig, setShowRegenerateConfig] = useState(false);

  // Generation log UI state
  const [logExpanded, setLogExpanded] = useState(false);

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

  // Prompt & Import state
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [promptLog, setPromptLog] = useState<SSELogEntry[]>([]);
  const [promptLogExpanded, setPromptLogExpanded] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importErrors, setImportErrors] = useState<Array<{ field: string; message: string }>>([]);
  const [importing, setImporting] = useState(false);
  const [committing, setCommitting] = useState(false);

  // Add channel deliverable state
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannelType, setNewChannelType] = useState("");
  const [newChannelAudience, setNewChannelAudience] = useState("");
  const [newChannelStage, setNewChannelStage] = useState("rollout");
  const [newChannelContent, setNewChannelContent] = useState("");
  const [addingChannel, setAddingChannel] = useState(false);

  // -------------------------------------------------------------------------
  // Data Loading
  // -------------------------------------------------------------------------

  const loadCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`);
      if (!res.ok) throw new Error("Failed to load campaign");
      const json: CampaignData = await res.json();
      setData(json);

      // Pre-select target audiences from campaign
      if (json.campaign.target_audiences) {
        setSelectedAudiences(new Set(json.campaign.target_audiences));
      }
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

  // -------------------------------------------------------------------------
  // Document Actions
  // -------------------------------------------------------------------------

  const toggleDocExpanded = (docId: string) => {
    setExpandedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const toggleDocIncluded = async (doc: CampaignDocument) => {
    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/documents/${doc.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_included: !doc.is_included }),
        }
      );
      if (!res.ok) throw new Error("Failed to update document");
      await loadCampaign();
    } catch {
      toast({ title: "Error", description: "Failed to toggle document inclusion." });
    }
  };

  const addDocument = async () => {
    if (!newDocTitle.trim()) return;
    setAddingDoc(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_role: newDocRole,
          title: newDocTitle.trim(),
          content_text: newDocContent.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add document");
      setNewDocTitle("");
      setNewDocRole("research_paper");
      setNewDocContent("");
      setShowAddDoc(false);
      toast({ title: "Document added", description: "Document has been added to the campaign." });
      await loadCampaign();
    } catch {
      toast({ title: "Error", description: "Failed to add document." });
    } finally {
      setAddingDoc(false);
    }
  };

  // -------------------------------------------------------------------------
  // Channel expansion
  // -------------------------------------------------------------------------

  const toggleChannelExpanded = (channelId: string) => {
    setExpandedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  };

  // -------------------------------------------------------------------------
  // Channel edit actions
  // -------------------------------------------------------------------------

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
    // Auto-expand the row
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

      // Auto-bump status to "drafted" if content changed from original
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
      await loadCampaign();
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
      await loadCampaign();
    } catch {
      toast({ title: "Error", description: "Failed to update channel status." });
    }
  };

  // -------------------------------------------------------------------------
  // Messaging Guidance edit actions
  // -------------------------------------------------------------------------

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
    setEditingAudience(null); // close audience edit if open
  };

  const cancelEditMessaging = () => {
    setEditingMessaging(false);
  };

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
      await loadCampaign();
    } catch {
      toast({ title: "Error", description: "Failed to save messaging guidance." });
    } finally {
      setSavingMessaging(false);
    }
  };

  // -------------------------------------------------------------------------
  // Audience Narrative edit actions
  // -------------------------------------------------------------------------

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
    setEditingMessaging(false); // close messaging edit if open
  };

  const cancelEditAudience = () => {
    setEditingAudience(null);
  };

  const saveAudience = async () => {
    if (!editingAudience || !strategyOutput?.audience_narratives) return;
    setSavingAudience(true);
    try {
      // Spread existing narratives + overwrite the edited one
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
      await loadCampaign();
    } catch {
      toast({ title: "Error", description: "Failed to save audience narrative." });
    } finally {
      setSavingAudience(false);
    }
  };

  // -------------------------------------------------------------------------
  // Channel stage change
  // -------------------------------------------------------------------------

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
      await loadCampaign();
    } catch {
      toast({ title: "Error", description: "Failed to update channel stage." });
    }
  };

  // -------------------------------------------------------------------------
  // Add channel deliverable
  // -------------------------------------------------------------------------

  const addChannelDeliverable = async () => {
    if (!newChannelType || !newChannelAudience) return;
    setAddingChannel(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: newChannelType,
          audience_segment: newChannelAudience,
          stage: newChannelStage,
          suggested_content: newChannelContent.trim() || null,
          status: "planned",
        }),
      });
      if (!res.ok) throw new Error("Failed to add channel deliverable");
      toast({
        title: "Deliverable added",
        description: `${getChannelLabel(newChannelType)} deliverable has been added.`,
      });
      setNewChannelType("");
      setNewChannelAudience("");
      setNewChannelStage("rollout");
      setNewChannelContent("");
      setShowAddChannel(false);
      await loadCampaign();
    } catch {
      toast({ title: "Error", description: "Failed to add deliverable." });
    } finally {
      setAddingChannel(false);
    }
  };

  // -------------------------------------------------------------------------
  // Prompt & Import handlers
  // -------------------------------------------------------------------------

  const handleGeneratePrompt = async () => {
    setGeneratingPrompt(true);
    setGeneratedPrompt(null);
    setPromptLog([]);
    setPromptLogExpanded(false);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/generate-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.body) throw new Error("No response stream");

      const reader = res.body.getReader();
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
      await loadCampaign();
    } catch (err) {
      toast({ title: "Import failed", description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setCommitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Strategy generation placeholder
  // -------------------------------------------------------------------------

  const toggleAudience = (audience: string) => {
    setSelectedAudiences((prev) => {
      const next = new Set(prev);
      if (next.has(audience)) {
        next.delete(audience);
      } else {
        next.add(audience);
      }
      return next;
    });
  };

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channel)) {
        next.delete(channel);
      } else {
        next.add(channel);
      }
      return next;
    });
  };

  // SSE streaming helper
  const runSSEGeneration = async (
    url: string,
    body: Record<string, unknown>,
    type: "brief" | "strategy"
  ) => {
    setGenerating(true);
    setGenerationType(type);
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
                  title: type === "brief" ? "AI Brief generated" : "Strategy generated",
                  description: entry.message,
                });
                loadCampaign(); // Reload data
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

  const handleGenerateBrief = () => {
    if (!data) return;
    runSSEGeneration(
      `/api/campaigns/${campaignId}/generate-brief`,
      { client_id: data.campaign.client_id, model: selectedModel },
      "brief"
    );
  };

  const handleGenerateStrategy = () => {
    if (!data) return;
    runSSEGeneration(
      `/api/campaigns/${campaignId}/generate-strategy`,
      {
        client_id: data.campaign.client_id,
        model: selectedModel,
        target_audiences: Array.from(selectedAudiences),
        channels: Array.from(selectedChannels),
      },
      "strategy"
    );
  };

  // -------------------------------------------------------------------------
  // Loading / Error States
  // -------------------------------------------------------------------------

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

  const { campaign, documents, channels, analysis } = data;
  const includedDocs = documents.filter((d) => d.is_included);
  const totalWords = includedDocs.reduce((sum, d) => sum + (d.word_count || 0), 0);
  // Build a StrategyOutput view from the analysis columns
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

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

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

      {/* ----------------------------------------------------------------- */}
      {/* Header */}
      {/* ----------------------------------------------------------------- */}
      <div className="mb-8">
        <div className="flex flex-wrap items-start gap-3 mb-2">
          <h1 className="font-display text-3xl leading-tight">{campaign.title}</h1>
          <Badge className={cn("mt-1", STATUS_COLORS[campaign.status] || "")}>
            {campaign.status}
          </Badge>
        </div>

        {/* Pillar badges */}
        {campaign.pillar_tags && campaign.pillar_tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {campaign.pillar_tags.map((pillar) => (
              <Badge key={pillar} variant="outline" className="text-xs">
                {pillar}
              </Badge>
            ))}
          </div>
        )}

        {/* Meta row */}
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

      <Separator className="mb-8" />

      {/* ----------------------------------------------------------------- */}
      {/* Documents Section */}
      {/* ----------------------------------------------------------------- */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-xl">Campaign Documents</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="font-mono tabular-nums">{includedDocs.length}</span>{" "}
              document{includedDocs.length !== 1 ? "s" : ""} included{" "}
              <span className="mx-1">&middot;</span>
              ~<span className="font-mono tabular-nums">{formatNumber(totalWords)}</span>{" "}
              words total
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddDoc(!showAddDoc)}
          >
            {showAddDoc ? (
              <>
                <X className="h-4 w-4" /> Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Add Document
              </>
            )}
          </Button>
        </div>

        {/* Add Document Form */}
        {showAddDoc && (
          <Card className="mb-4 border-dashed">
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doc-title">Title</Label>
                  <Input
                    id="doc-title"
                    placeholder="Document title"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-role">Role</Label>
                  <Select
                    value={newDocRole}
                    onValueChange={(v) => setNewDocRole(v as DocumentRole)}
                  >
                    <SelectTrigger id="doc-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-content">Content</Label>
                <textarea
                  id="doc-content"
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Paste document text here..."
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={addDocument} disabled={!newDocTitle.trim() || addingDoc}>
                  {addingDoc ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" /> Add Document
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Document Cards */}
        {documents.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No documents yet. Add your first document above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => {
              const isExpanded = expandedDocs.has(doc.id);
              return (
                <Card
                  key={doc.id}
                  className={cn(
                    "transition-colors",
                    !doc.is_included && "opacity-60"
                  )}
                >
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-medium",
                              ROLE_COLORS[doc.document_role] || ""
                            )}
                          >
                            {getRoleLabel(doc.document_role)}
                          </Badge>
                          <span className="font-medium text-sm truncate">
                            {doc.title}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {doc.word_count != null && (
                            <span>
                              <span className="font-mono tabular-nums">
                                {formatNumber(doc.word_count)}
                              </span>{" "}
                              words
                            </span>
                          )}
                          {doc.source && <span>{doc.source}</span>}
                          <span>{formatDate(doc.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Include/Exclude Toggle */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-8 w-8",
                            doc.is_included
                              ? "text-green-600 hover:text-green-700"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          onClick={() => toggleDocIncluded(doc)}
                          title={doc.is_included ? "Included — click to exclude" : "Excluded — click to include"}
                        >
                          {doc.is_included ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                        {/* Expand/Collapse */}
                        {doc.content_text && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleDocExpanded(doc.id)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    {/* Expanded content */}
                    {isExpanded && doc.content_text && (
                      <div className="mt-3 pt-3 border-t">
                        <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-muted-foreground max-h-80 overflow-y-auto">
                          {doc.content_text}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Generate AI Brief Button */}
        {documents.some((d) => d.document_role === "research_paper" && d.content_text) && (
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={generating}
              onClick={handleGenerateBrief}
            >
              {generating && generationType === "brief" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating && generationType === "brief" ? "Generating Brief..." : "Generate AI Brief"}
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              Condense the research paper into a structured summary for the team.
            </p>
          </div>
        )}
      </section>

      {/* SSE Generation Log */}
      {(generating || generationLog.length > 0) && (
        <Card className="mb-8">
          <CardContent className="pt-5 pb-4 space-y-3">
            {/* Header row: title + status + expand toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Check className="h-4 w-4 text-emerald-600" />
                )}
                <span className="text-sm font-medium">
                  {generationType === "brief" ? "AI Brief Generation" : "Strategy Generation"}
                </span>
                {!generating && generationLog.length > 0 && (
                  <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                    {(() => {
                      const first = generationLog[0]?.timestamp;
                      const last = generationLog[generationLog.length - 1]?.timestamp;
                      if (first && last) {
                        const secs = Math.round((new Date(last).getTime() - new Date(first).getTime()) / 1000);
                        return `${secs}s`;
                      }
                      return "";
                    })()}
                  </Badge>
                )}
              </div>
              {generationLog.length > 0 && (
                <button
                  type="button"
                  onClick={() => setLogExpanded(!logExpanded)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {logExpanded ? (
                    <>
                      Hide log <ChevronUp className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      Show log ({generationLog.length}) <ChevronDown className="h-3 w-3" />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Animated progress bar */}
            {generating && (
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="absolute inset-y-0 w-1/3 rounded-full bg-primary animate-indeterminate" />
              </div>
            )}

            {/* Latest status line (always visible when not expanded) */}
            {!logExpanded && generationLog.length > 0 && (
              <p className="text-xs text-muted-foreground truncate">
                {generationLog[generationLog.length - 1]?.message}
              </p>
            )}

            {/* Expandable log entries */}
            {logExpanded && (
              <div className="bg-muted/50 rounded-md p-3 max-h-60 overflow-y-auto font-mono text-xs space-y-1">
                {generationLog.map((entry, i) => {
                  const ts = entry.timestamp ? new Date(entry.timestamp) : null;
                  const timeStr = ts
                    ? ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                    : "";
                  return (
                    <div
                      key={i}
                      className={cn(
                        "leading-relaxed",
                        entry.level === "error" && "text-destructive",
                        entry.level === "warn" && "text-amber-600",
                        entry.level === "success" && "text-emerald-600",
                        entry.level === "done" && "text-emerald-700 font-semibold",
                        entry.level === "info" && "text-muted-foreground"
                      )}
                    >
                      <span className="opacity-40">{timeStr}</span>{" "}
                      <span className="opacity-50">[{entry.level}]</span> {entry.message}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Separator className="mb-8" />

      {/* ----------------------------------------------------------------- */}
      {/* Strategy Section */}
      {/* ----------------------------------------------------------------- */}
      <section className="mb-10">
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
                              /* Edit mode for this audience */
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
                              /* Display mode for this audience */
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

            {/* Regenerate Config Form (shown after confirmation dialog) */}
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
                    <Label htmlFor="regen-model-select" className="text-xs uppercase tracking-wider text-muted-foreground">
                      AI Model
                    </Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger id="regen-model-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="claude">Claude (claude-sonnet-4)</SelectItem>
                        <SelectItem value="gemini">Gemini (gemini-3-pro-preview)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setShowRegenerateConfig(false);
                        handleGenerateStrategy();
                      }}
                      disabled={
                        generating ||
                        includedDocs.length === 0 ||
                        selectedAudiences.size === 0 ||
                        selectedChannels.size === 0
                      }
                    >
                      {generating && generationType === "strategy" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      {generating && generationType === "strategy" ? "Regenerating..." : "Regenerate Strategy"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setShowRegenerateConfig(false)}
                      disabled={generating}
                    >
                      Cancel
                    </Button>
                  </div>

                  {includedDocs.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Include at least one document to regenerate.
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
                <Label htmlFor="model-select" className="text-xs uppercase tracking-wider text-muted-foreground">
                  AI Model
                </Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger id="model-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude">Claude (claude-sonnet-4)</SelectItem>
                    <SelectItem value="gemini">Gemini (gemini-3-pro-preview)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Generate Button */}
              <div className="flex justify-center pt-2">
                <Button
                  onClick={handleGenerateStrategy}
                  disabled={
                    generating ||
                    includedDocs.length === 0 ||
                    selectedAudiences.size === 0 ||
                    selectedChannels.size === 0
                  }
                >
                  {generating && generationType === "strategy" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {generating && generationType === "strategy" ? "Generating..." : "Generate Strategy"}
                </Button>
              </div>
              {includedDocs.length === 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  Include at least one document to generate a strategy.
                </p>
              )}
              {includedDocs.length > 0 && selectedAudiences.size === 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  Select at least one target audience.
                </p>
              )}
              {includedDocs.length > 0 && selectedAudiences.size > 0 && selectedChannels.size === 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  Select at least one channel.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </section>

      <Separator className="mb-8" />

      {/* ----------------------------------------------------------------- */}
      {/* Prompt & Import */}
      {/* ----------------------------------------------------------------- */}
      <section className="mb-10">
        <h2 className="font-display text-xl mb-4">Prompt & Import</h2>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column — Generate Prompt */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Generate Prompt</CardTitle>
              <p className="text-xs text-muted-foreground">
                Build a prompt from your campaign metadata, documents, and strategy. Copy it into Claude App to generate your campaign calendar.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleGeneratePrompt}
                disabled={generatingPrompt || includedDocs.length === 0}
                className="w-full"
              >
                {generatingPrompt ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {generatingPrompt ? "Generating..." : "Generate Prompt"}
              </Button>

              {includedDocs.length === 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  Include at least one document above to generate a prompt.
                </p>
              )}

              {/* SSE log bar for prompt generation */}
              {(generatingPrompt || promptLog.length > 0) && (
                <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                  {/* Header: icon + title + duration + toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {generatingPrompt ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : promptLog.some((e) => e.level === "error") ? (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      ) : (
                        <Check className="h-4 w-4 text-emerald-600" />
                      )}
                      <span className="text-sm font-medium">Prompt Generation</span>
                      {!generatingPrompt && promptLog.length > 0 && (
                        <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                          {(() => {
                            const first = promptLog[0]?.timestamp;
                            const last = promptLog[promptLog.length - 1]?.timestamp;
                            if (first && last) {
                              const ms = new Date(last).getTime() - new Date(first).getTime();
                              return ms < 1000 ? `${ms}ms` : `${Math.round(ms / 1000)}s`;
                            }
                            return "";
                          })()}
                        </Badge>
                      )}
                    </div>
                    {promptLog.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPromptLogExpanded(!promptLogExpanded)}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {promptLogExpanded ? (
                          <>
                            Hide log <ChevronUp className="h-3 w-3" />
                          </>
                        ) : (
                          <>
                            Show log ({promptLog.length}) <ChevronDown className="h-3 w-3" />
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Indeterminate progress bar */}
                  {generatingPrompt && (
                    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="absolute inset-y-0 w-1/3 rounded-full bg-primary animate-indeterminate" />
                    </div>
                  )}

                  {/* Latest status (collapsed) */}
                  {!promptLogExpanded && promptLog.length > 0 && (
                    <p className="text-xs text-muted-foreground truncate">
                      {promptLog[promptLog.length - 1]?.message}
                    </p>
                  )}

                  {/* Expandable log entries */}
                  {promptLogExpanded && (
                    <div className="bg-muted/50 rounded-md p-3 max-h-60 overflow-y-auto font-mono text-xs space-y-1">
                      {promptLog.map((entry, i) => {
                        const ts = entry.timestamp ? new Date(entry.timestamp) : null;
                        const timeStr = ts
                          ? ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                          : "";
                        return (
                          <div
                            key={i}
                            className={cn(
                              "leading-relaxed",
                              entry.level === "error" && "text-destructive",
                              entry.level === "warn" && "text-amber-600",
                              entry.level === "success" && "text-emerald-600",
                              entry.level === "done" && "text-emerald-700 font-semibold",
                              entry.level === "info" && "text-muted-foreground"
                            )}
                          >
                            <span className="opacity-40">{timeStr}</span>{" "}
                            <span className="opacity-50">[{entry.level}]</span> {entry.message}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

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
                  // Clear preview/errors when user edits
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

                  {/* Summary badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {importPreview.summary.channels.map((ch) => (
                      <Badge key={ch} variant="secondary" className="text-[10px]">
                        {getChannelLabel(ch)}
                      </Badge>
                    ))}
                    <span className="text-muted-foreground text-[10px] px-1">·</span>
                    {importPreview.summary.stages.map((s) => (
                      <Badge key={s} variant="outline" className="text-[10px]">
                        {CAMPAIGN_STAGES.find((st) => st.value === s)?.label || s}
                      </Badge>
                    ))}
                  </div>

                  {/* Week-grouped preview */}
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

                  {/* Confirm Import button */}
                  <Button
                    onClick={handleCommitImport}
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
                  <p className="text-[11px] text-muted-foreground text-center">
                    This will replace all existing deliverables for this campaign.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="mb-8" />

      {/* ----------------------------------------------------------------- */}
      {/* Channel Plan Table — Week-Grouped Calendar View */}
      {/* ----------------------------------------------------------------- */}
      <section className="mb-10">
        <h2 className="font-display text-xl mb-4">
          Channel Plan
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
                  ? "No channel plans created yet. Use Prompt & Import above to generate deliverables."
                  : "Channel plans will be generated with the campaign strategy, or via Prompt & Import."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Group channels by week_number */}
            {(() => {
              // Build week groups — null weeks go to "Unscheduled"
              const weekMap = new Map<number | null, CampaignChannel[]>();
              for (const ch of channels) {
                const wk = ch.week_number;
                if (!weekMap.has(wk)) weekMap.set(wk, []);
                weekMap.get(wk)!.push(ch);
              }
              // Sort: numbered weeks first (ascending), null last
              const weekKeys = Array.from(weekMap.keys()).sort((a, b) => {
                if (a === null) return 1;
                if (b === null) return -1;
                return a - b;
              });

              return weekKeys.map((weekNum) => {
                const weekChannels = weekMap.get(weekNum)!;
                // Determine stage from the first channel in this week
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
                          if (isEditing) return; // Don't collapse while editing
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
                        {/* Phase — inline dropdown */}
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
                        {/* Status — inline dropdown */}
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
                          {ch.scheduled_for
                            ? formatDate(ch.scheduled_for)
                            : "--"}
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="shrink-0 text-muted-foreground hover:text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditChannel(ch);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5 mr-1" />
                                  Edit
                                </Button>
                              </div>
                              {ch.hashtags && ch.hashtags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {ch.hashtags.map((tag, i) => (
                                    <Badge
                                      key={i}
                                      variant="secondary"
                                      className="text-[10px]"
                                    >
                                      #{tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {ch.mentions && ch.mentions.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {ch.mentions.map((m, i) => (
                                    <Badge
                                      key={i}
                                      variant="outline"
                                      className="text-[10px]"
                                    >
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
                              {/* Content textarea with char counter */}
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
                                {/* Char count indicator */}
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

                              {/* Status / Hashtags / Mentions grid */}
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

                              {/* Media suggestion */}
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

                              {/* Action buttons */}
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Content <span className="normal-case font-normal">(optional)</span>
                    </Label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={newChannelContent}
                      onChange={(e) => setNewChannelContent(e.target.value)}
                      disabled={addingChannel}
                      placeholder="Draft content for this deliverable..."
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={addChannelDeliverable}
                      disabled={addingChannel || !newChannelType || !newChannelAudience}
                    >
                      {addingChannel ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      {addingChannel ? "Adding..." : "Add Deliverable"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddChannel(false);
                        setNewChannelType("");
                        setNewChannelAudience("");
                        setNewChannelStage("rollout");
                        setNewChannelContent("");
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
    </div>
  );
}
