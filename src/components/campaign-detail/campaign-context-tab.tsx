// @component CampaignContextTab — Documents + AI Brief generation
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { DOCUMENT_ROLES, type DocumentRole } from "@/lib/tokens";
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
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Plus,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { Campaign, CampaignDocument, SSELogEntry } from "./types";
import { ROLE_COLORS, formatDate, formatNumber, getRoleLabel } from "./helpers";
import { SSEGenerationLog } from "./sse-generation-log";

interface CampaignContextTabProps {
  campaignId: string;
  campaign: Campaign;
  documents: CampaignDocument[];
  includedDocs: CampaignDocument[];
  totalWords: number;
  onRefresh: () => Promise<void>;
}

export function CampaignContextTab({
  campaignId,
  documents,
  includedDocs,
  totalWords,
  onRefresh,
}: CampaignContextTabProps) {
  const { toast } = useToast();

  // Document expansion state
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());

  // Add document form state
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocRole, setNewDocRole] = useState<DocumentRole>("research_paper");
  const [newDocContent, setNewDocContent] = useState("");
  const [addingDoc, setAddingDoc] = useState(false);

  // Brief generation SSE state
  const [generating, setGenerating] = useState(false);
  const [generationLog, setGenerationLog] = useState<SSELogEntry[]>([]);
  const [logExpanded, setLogExpanded] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────

  const toggleDocExpanded = (docId: string) => {
    setExpandedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
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
      await onRefresh();
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
      await onRefresh();
    } catch {
      toast({ title: "Error", description: "Failed to add document." });
    } finally {
      setAddingDoc(false);
    }
  };

  const handleGenerateBrief = async () => {
    setGenerating(true);
    setGenerationLog([]);
    setLogExpanded(false);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/generate-brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: "unused", model: "claude" }),
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
                  title: "AI Brief generated",
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
    }
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <section>
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
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {generating ? "Generating Brief..." : "Generate AI Brief"}
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            Condense the research paper into a structured summary for the team.
          </p>
        </div>
      )}

      {/* SSE Generation Log */}
      <div className="mt-4">
        <SSEGenerationLog
          title="AI Brief Generation"
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
