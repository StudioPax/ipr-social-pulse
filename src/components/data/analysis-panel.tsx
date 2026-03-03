// @component AnalysisPanel — AI analysis engine controls
// Pre-scan UI, model selector, run buttons, log window, progress bar
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PrescanResult {
  current: number;
  stale: number;
  new: number;
  total: number;
}

interface KeyStatus {
  claude: { configured: boolean; model: string };
  gemini: { configured: boolean; model: string };
}

interface LogEntry {
  time: string;
  level: "info" | "success" | "error" | "warn";
  message: string;
}

interface AnalysisPanelProps {
  clientId: string;
  onAnalysisComplete: () => void;
}

const LOG_COLORS: Record<string, string> = {
  info: "text-blue-400",
  success: "text-green-400",
  error: "text-red-400",
  warn: "text-amber-400",
};

export function AnalysisPanel({
  clientId,
  onAnalysisComplete,
}: AnalysisPanelProps) {
  const [prescan, setPrescan] = useState<PrescanResult | null>(null);
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null);
  const [selectedModel, setSelectedModel] = useState<"claude" | "gemini">(
    "claude"
  );
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState<{
    analyzed: number;
    queued: number;
  } | null>(null);
  const [showLog, setShowLog] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback(
    (level: LogEntry["level"], message: string) => {
      const time = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setLogs((prev) => [...prev, { time, level, message }]);
    },
    []
  );

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // Load prescan + key status on mount
  useEffect(() => {
    async function load() {
      const [prescanRes, keysRes] = await Promise.all([
        fetch(`/api/analyze?client_id=${clientId}&action=prescan`),
        fetch(`/api/settings/keys?client_id=${clientId}`),
      ]);

      if (prescanRes.ok) {
        const data = await prescanRes.json();
        setPrescan(data);
      }

      if (keysRes.ok) {
        const data: KeyStatus = await keysRes.json();
        setKeyStatus(data);
        // Auto-select the first configured model
        if (data.claude.configured) setSelectedModel("claude");
        else if (data.gemini.configured) setSelectedModel("gemini");
      }
    }
    load();
  }, [clientId]);

  async function runAnalysis(runType: "new_only" | "new_and_stale" | "full") {
    if (!keyStatus) return;

    const modelConfig =
      selectedModel === "claude" ? keyStatus.claude : keyStatus.gemini;
    if (!modelConfig.configured) {
      addLog("error", `No ${selectedModel} API key configured. Go to Settings.`);
      return;
    }

    setIsRunning(true);
    setShowLog(true);
    setLogs([]);
    setProgress(null);

    addLog("info", `Initiating ${runType} analysis with ${selectedModel}...`);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          run_type: runType,
          model: selectedModel,
        }),
      });

      // Check if it's a non-streaming error response (e.g. 400)
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (!res.ok) {
          addLog("error", data.error || "Analysis failed");
        } else if (data.status === "completed" && data.posts_queued === 0) {
          addLog("info", data.message || "No posts need analysis");
        }
        setIsRunning(false);
        return;
      }

      // Read SSE stream
      const reader = res.body?.getReader();
      if (!reader) {
        addLog("error", "No response stream available");
        setIsRunning(false);
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
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            const level = event.level as string;

            // Handle "done" event — final summary
            if (level === "done") {
              // Update progress one final time
              if (event.posts_analyzed !== undefined) {
                setProgress({
                  analyzed: event.posts_analyzed,
                  queued: event.posts_queued || 0,
                });
              }
              // Refresh prescan + parent data
              const prescanRes = await fetch(
                `/api/analyze?client_id=${clientId}&action=prescan`
              );
              if (prescanRes.ok) {
                setPrescan(await prescanRes.json());
              }
              onAnalysisComplete();
              continue;
            }

            addLog(level as LogEntry["level"], event.message);

            // Update progress bar from streamed data
            if (event.analyzed !== undefined && event.queued !== undefined) {
              setProgress({
                analyzed: event.analyzed,
                queued: event.queued,
              });
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    } catch (err) {
      addLog(
        "error",
        err instanceof Error ? err.message : "Analysis request failed"
      );
    }

    setIsRunning(false);
  }

  const hasConfiguredModel =
    keyStatus?.claude.configured || keyStatus?.gemini.configured;
  const newAndStaleCount = (prescan?.new || 0) + (prescan?.stale || 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          AI Analysis Engine
          {isRunning && (
            <Badge className="bg-amber-100 text-amber-800 text-xs animate-pulse">
              Running
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Model Selection */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Model</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={selectedModel === "claude" ? "default" : "outline"}
              onClick={() => setSelectedModel("claude")}
              disabled={!keyStatus?.claude.configured || isRunning}
            >
              Claude
              {!keyStatus?.claude.configured && (
                <span className="ml-1 text-[10px] opacity-60">
                  (no key)
                </span>
              )}
            </Button>
            <Button
              size="sm"
              variant={selectedModel === "gemini" ? "default" : "outline"}
              onClick={() => setSelectedModel("gemini")}
              disabled={!keyStatus?.gemini.configured || isRunning}
            >
              Gemini
              {!keyStatus?.gemini.configured && (
                <span className="ml-1 text-[10px] opacity-60">
                  (no key)
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Pre-Scan Results */}
        {prescan && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Pre-Scan</p>
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-md border p-2 text-center">
                <p className="font-mono text-lg font-bold">{prescan.current}</p>
                <p className="text-[10px] text-muted-foreground">Current</p>
              </div>
              <div className="rounded-md border p-2 text-center">
                <p className="font-mono text-lg font-bold text-amber-600">
                  {prescan.stale}
                </p>
                <p className="text-[10px] text-muted-foreground">Stale</p>
              </div>
              <div className="rounded-md border p-2 text-center">
                <p className="font-mono text-lg font-bold text-accent">
                  {prescan.new}
                </p>
                <p className="text-[10px] text-muted-foreground">New</p>
              </div>
              <div className="rounded-md border p-2 text-center">
                <p className="font-mono text-lg font-bold">{prescan.total}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
        )}

        {/* Run Buttons */}
        {hasConfiguredModel && prescan && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => runAnalysis("new_and_stale")}
              disabled={isRunning || newAndStaleCount === 0}
            >
              Run New + Stale ({newAndStaleCount})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => runAnalysis("new_only")}
              disabled={isRunning || (prescan?.new || 0) === 0}
            >
              New Only ({prescan?.new || 0})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => runAnalysis("full")}
              disabled={isRunning || prescan.total === 0}
            >
              Full ({prescan.total})
            </Button>
          </div>
        )}

        {!hasConfiguredModel && (
          <p className="text-sm text-muted-foreground">
            No AI model configured. Add an API key in{" "}
            <a href="/settings" className="text-accent hover:underline">
              Settings
            </a>
            .
          </p>
        )}

        {/* Progress Bar */}
        {progress && progress.queued > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>
                {progress.analyzed} / {progress.queued} posts
              </span>
              <span>
                {Math.round((progress.analyzed / progress.queued) * 100)}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{
                  width: `${(progress.analyzed / progress.queued) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* System Log */}
        {logs.length > 0 && (
          <div>
            <button
              onClick={() => setShowLog(!showLog)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <span>{showLog ? "▾" : "▸"}</span>
              System Log
              <Badge variant="secondary" className="text-[10px] ml-1">
                {logs.length}
              </Badge>
            </button>
            {showLog && (
              <div
                ref={logRef}
                className="mt-2 max-h-64 overflow-y-auto rounded-md bg-[#1a1a2e] p-3 font-mono text-xs"
              >
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-gray-500 shrink-0">{log.time}</span>
                    <span className={`shrink-0 uppercase w-10 ${LOG_COLORS[log.level]}`}>
                      {log.level === "success" ? "OK" : log.level.toUpperCase()}
                    </span>
                    <span className="text-gray-300">{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
