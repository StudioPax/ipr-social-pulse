// @component SSEGenerationLog — Collapsible streaming log display
"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import type { SSELogEntry } from "./types";

interface SSEGenerationLogProps {
  title: string;
  entries: SSELogEntry[];
  isRunning: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  /** If true, renders as a standalone Card. Otherwise renders as inline bordered box. */
  variant?: "card" | "inline";
}

export function SSEGenerationLog({
  title,
  entries,
  isRunning,
  expanded,
  onToggleExpanded,
  variant = "card",
}: SSEGenerationLogProps) {
  if (!isRunning && entries.length === 0) return null;

  const hasError = entries.some((e) => e.level === "error");

  const durationBadge = (() => {
    if (isRunning || entries.length === 0) return null;
    const first = entries[0]?.timestamp;
    const last = entries[entries.length - 1]?.timestamp;
    if (!first || !last) return null;
    const ms = new Date(last).getTime() - new Date(first).getTime();
    const label = ms < 1000 ? `${ms}ms` : `${Math.round(ms / 1000)}s`;
    return (
      <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
        {label}
      </Badge>
    );
  })();

  const content = (
    <div className="space-y-2">
      {/* Header: icon + title + duration + toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : hasError ? (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          ) : (
            <Check className="h-4 w-4 text-emerald-600" />
          )}
          <span className="text-sm font-medium">{title}</span>
          {durationBadge}
        </div>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={onToggleExpanded}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? (
              <>
                Hide log <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                Show log ({entries.length}) <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Indeterminate progress bar */}
      {isRunning && (
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="absolute inset-y-0 w-1/3 rounded-full bg-primary animate-indeterminate" />
        </div>
      )}

      {/* Latest status (collapsed) */}
      {!expanded && entries.length > 0 && (
        <p className="text-xs text-muted-foreground truncate">
          {entries[entries.length - 1]?.message}
        </p>
      )}

      {/* Expandable log entries */}
      {expanded && (
        <div className="bg-muted/50 rounded-md p-3 max-h-60 overflow-y-auto font-mono text-xs space-y-1">
          {entries.map((entry, i) => {
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
  );

  if (variant === "inline") {
    return (
      <div className="rounded-md border bg-muted/30 p-3">
        {content}
      </div>
    );
  }

  // Card variant
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm mb-8">
      <div className="pt-5 pb-4 px-6">
        {content}
      </div>
    </div>
  );
}
