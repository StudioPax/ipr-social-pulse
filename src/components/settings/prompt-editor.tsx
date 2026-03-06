// @component PromptEditor — View/edit AI prompt templates stored in Supabase
// Settings module — owner-only visibility (gated in settings page)
"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface PromptTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  version: string;
  system_prompt: string;
  user_message_template: string | null;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  updated_at: string;
}

/** Prompt metadata for sidebar display */
const PROMPT_META: Record<string, { icon: string; consumer: string }> = {
  "audience-narrative": { icon: "AN", consumer: "Campaign Audience" },
  "campaign-brief": { icon: "CB", consumer: "AI Brief Generator" },
  "campaign-strategy": { icon: "CS", consumer: "Strategy Generator" },
  "dashboard-insights": { icon: "DI", consumer: "Dashboard Insights" },
  "post-analysis": { icon: "PA", consumer: "Post Analysis" },
};

interface PromptEditorProps {
  clientId: string;
}

export function PromptEditor({ clientId }: PromptEditorProps) {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Editor state (local draft)
  const [draftPrompt, setDraftPrompt] = useState("");
  const [draftTemp, setDraftTemp] = useState(0);
  const [draftTokens, setDraftTokens] = useState(4096);
  const [hasChanges, setHasChanges] = useState(false);

  const loadPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/settings/prompts?client_id=${clientId}`
      );
      if (res.ok) {
        const data = await res.json();
        setPrompts(data.prompts || []);
        // Auto-select first prompt if none selected
        if (!selectedSlug && data.prompts?.length > 0) {
          setSelectedSlug(data.prompts[0].slug);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [clientId, selectedSlug]);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  // When selected prompt changes, populate editor
  const selectedPrompt = prompts.find((p) => p.slug === selectedSlug);

  useEffect(() => {
    if (selectedPrompt) {
      setDraftPrompt(selectedPrompt.system_prompt);
      setDraftTemp(selectedPrompt.temperature);
      setDraftTokens(selectedPrompt.max_tokens);
      setHasChanges(false);
      setFeedback(null);
    }
  }, [selectedPrompt]);

  function handlePromptChange(value: string) {
    setDraftPrompt(value);
    setHasChanges(
      value !== selectedPrompt?.system_prompt ||
        draftTemp !== selectedPrompt?.temperature ||
        draftTokens !== selectedPrompt?.max_tokens
    );
  }

  function handleTempChange(value: string) {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0 && num <= 2) {
      setDraftTemp(num);
      setHasChanges(
        draftPrompt !== selectedPrompt?.system_prompt ||
          num !== selectedPrompt?.temperature ||
          draftTokens !== selectedPrompt?.max_tokens
      );
    }
  }

  function handleTokensChange(value: string) {
    const num = parseInt(value);
    if (!isNaN(num) && num >= 256 && num <= 32768) {
      setDraftTokens(num);
      setHasChanges(
        draftPrompt !== selectedPrompt?.system_prompt ||
          draftTemp !== selectedPrompt?.temperature ||
          num !== selectedPrompt?.max_tokens
      );
    }
  }

  function handleReset() {
    if (selectedPrompt) {
      setDraftPrompt(selectedPrompt.system_prompt);
      setDraftTemp(selectedPrompt.temperature);
      setDraftTokens(selectedPrompt.max_tokens);
      setHasChanges(false);
      setFeedback(null);
    }
  }

  async function handleSave() {
    if (!selectedPrompt || !hasChanges) return;
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/settings/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          slug: selectedPrompt.slug,
          system_prompt: draftPrompt,
          temperature: draftTemp,
          max_tokens: draftTokens,
        }),
      });

      if (res.ok) {
        setFeedback({ type: "success", message: "Prompt saved" });
        setHasChanges(false);
        // Refresh the list to pick up new updated_at
        await loadPrompts();
      } else {
        const data = await res.json();
        setFeedback({
          type: "error",
          message: data.error || "Failed to save",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error" });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  }

  if (loading) {
    return (
      <div className="mt-4 space-y-3">
        <div className="h-12 w-full animate-pulse rounded bg-muted" />
        <div className="h-48 w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (prompts.length === 0) {
    return (
      <Card className="mt-4">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No prompt templates found. Run the seed script to initialize prompts.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
      {/* Sidebar — prompt list */}
      <div className="space-y-1.5">
        {prompts.map((p) => {
          const meta = PROMPT_META[p.slug] || {
            icon: p.slug.slice(0, 2).toUpperCase(),
            consumer: p.slug,
          };
          const isSelected = p.slug === selectedSlug;
          return (
            <button
              key={p.slug}
              onClick={() => setSelectedSlug(p.slug)}
              className={cn(
                "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                isSelected
                  ? "border-accent bg-accent/10"
                  : "border-transparent hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground">
                  {meta.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {meta.consumer} &middot; {p.version}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Editor area */}
      {selectedPrompt && (
        <Card>
          <CardContent className="space-y-4 py-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold">{selectedPrompt.name}</h4>
                {selectedPrompt.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {selectedPrompt.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] font-mono">
                  {selectedPrompt.version}
                </Badge>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {selectedPrompt.slug}
                </Badge>
              </div>
            </div>

            {/* System Prompt */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                System Prompt
              </Label>
              <Textarea
                value={draftPrompt}
                onChange={(e) => handlePromptChange(e.target.value)}
                rows={16}
                className="font-mono text-xs leading-relaxed resize-y"
                placeholder="System prompt..."
              />
              <p className="text-[10px] text-muted-foreground">
                {draftPrompt.length.toLocaleString()} characters
              </p>
            </div>

            {/* Parameters */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Temperature
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={draftTemp}
                  onChange={(e) => handleTempChange(e.target.value)}
                  className="font-mono text-xs h-9"
                />
                <p className="text-[10px] text-muted-foreground">
                  0 = deterministic, 1 = creative
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Max Tokens
                </Label>
                <Input
                  type="number"
                  step="256"
                  min="256"
                  max="32768"
                  value={draftTokens}
                  onChange={(e) => handleTokensChange(e.target.value)}
                  className="font-mono text-xs h-9"
                />
                <p className="text-[10px] text-muted-foreground">
                  Maximum response length
                </p>
              </div>
            </div>

            {/* User Message Template (read-only) */}
            {selectedPrompt.user_message_template && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  User Message Template{" "}
                  <span className="text-muted-foreground/60">(read-only)</span>
                </Label>
                <Textarea
                  value={selectedPrompt.user_message_template}
                  readOnly
                  rows={6}
                  className="font-mono text-[11px] leading-relaxed bg-muted/50 text-muted-foreground resize-y cursor-default"
                />
                <p className="text-[10px] text-muted-foreground">
                  User messages are built in code and not editable here.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-[10px] text-muted-foreground">
                Last updated:{" "}
                {new Date(selectedPrompt.updated_at).toLocaleString()}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleReset}
                  disabled={!hasChanges || saving}
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>

            {/* Feedback */}
            {feedback && (
              <p
                className={cn(
                  "text-xs",
                  feedback.type === "success"
                    ? "text-green-600"
                    : "text-destructive"
                )}
              >
                {feedback.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
