// @page Settings — Client configuration, social accounts, AI model keys
// App Spec §1.2 — Client Manager UI + Phase 2 API key management
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface Client {
  id: string;
  client_name: string;
  knowledge_repo_url: string | null;
  created_at: string;
}

interface SocialAccount {
  id: string;
  platform: string;
  account_id: string;
  handle: string | null;
  is_default: boolean;
}

interface KeyStatus {
  claude: { configured: boolean; model: string };
  gemini: { configured: boolean; model: string };
}

const PLATFORM_META: Record<string, { label: string; color: string }> = {
  linkedin: { label: "LinkedIn", color: "bg-[#0A66C2]" },
  twitter: { label: "Twitter / X", color: "bg-[#1DA1F2]" },
  facebook: { label: "Facebook", color: "bg-[#1877F2]" },
  instagram: { label: "Instagram", color: "bg-[#E4405F]" },
  bluesky: { label: "Bluesky", color: "bg-[#0085FF]" },
};

export default function SettingsPage() {
  const [client, setClient] = useState<Client | null>(null);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // AI Model key state
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null);
  const [claudeKey, setClaudeKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [savingClaude, setSavingClaude] = useState(false);
  const [savingGemini, setSavingGemini] = useState(false);
  const [testingClaude, setTestingClaude] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, { type: "success" | "error"; message: string }>>({});

  const loadKeyStatus = useCallback(async (clientId: string) => {
    const res = await fetch(`/api/settings/keys?client_id=${clientId}`);
    if (res.ok) {
      const data = await res.json();
      setKeyStatus(data);
    }
  }, []);

  useEffect(() => {
    async function load() {
      const { data: clients } = await supabase
        .from("clients")
        .select("*")
        .limit(1)
        .single();

      if (clients) {
        setClient(clients);
        const { data: accts } = await supabase
          .from("social_accounts")
          .select("*")
          .eq("client_id", clients.id)
          .order("platform");
        if (accts) setAccounts(accts);
        await loadKeyStatus(clients.id);
      }
      setLoading(false);
    }
    load();
  }, [loadKeyStatus]);

  async function handleSaveKey(model: "claude" | "gemini") {
    if (!client) return;
    const key = model === "claude" ? claudeKey : geminiKey;
    if (!key.trim()) return;

    const setter = model === "claude" ? setSavingClaude : setSavingGemini;
    setter(true);

    const res = await fetch("/api/settings/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: client.id,
        key_type: model === "claude" ? "anthropic_api_key" : "gemini_api_key",
        api_key: key.trim(),
      }),
    });

    const data = await res.json();
    setter(false);

    if (res.ok) {
      setFeedback((prev) => ({
        ...prev,
        [model]: { type: "success", message: "Key saved" },
      }));
      if (model === "claude") setClaudeKey("");
      else setGeminiKey("");
      await loadKeyStatus(client.id);
    } else {
      setFeedback((prev) => ({
        ...prev,
        [model]: { type: "error", message: data.error || "Failed to save" },
      }));
    }

    setTimeout(() => setFeedback((prev) => ({ ...prev, [model]: undefined as never })), 3000);
  }

  async function handleTestKey(model: "claude" | "gemini") {
    if (!client) return;
    const setter = model === "claude" ? setTestingClaude : setTestingGemini;
    setter(true);

    const res = await fetch("/api/settings/keys", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: client.id, model }),
    });

    const data = await res.json();
    setter(false);

    setFeedback((prev) => ({
      ...prev,
      [`${model}_test`]: {
        type: data.success ? "success" : "error",
        message: data.success
          ? `Connected (${data.latencyMs}ms)`
          : data.message || "Test failed",
      },
    }));

    setTimeout(
      () => setFeedback((prev) => ({ ...prev, [`${model}_test`]: undefined as never })),
      5000
    );
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
      <h2 className="font-display text-2xl">Settings</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage client configuration, connected accounts, and AI model keys.
      </p>

      <Separator className="my-6" />

      {/* Client Info */}
      {client && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Client Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Organization</span>
              <span className="text-sm font-medium">{client.client_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Knowledge Repo</span>
              <a
                href={client.knowledge_repo_url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline"
              >
                {client.knowledge_repo_url || "Not configured"}
              </a>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Client ID</span>
              <code className="font-mono text-xs text-muted-foreground">
                {client.id}
              </code>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Social Accounts */}
      <h3 className="mt-8 text-lg font-semibold">Connected Accounts</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Social media accounts linked to this client. API connectors pull data from these.
      </p>

      <div className="mt-4 grid gap-3">
        {accounts.map((account) => {
          const meta = PLATFORM_META[account.platform] || {
            label: account.platform,
            color: "bg-muted",
          };
          return (
            <Card key={account.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-md ${meta.color}`}
                >
                  <span className="text-sm font-bold text-white">
                    {meta.label.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{meta.label}</span>
                    {account.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        Default
                      </Badge>
                    )}
                    {account.platform === "bluesky" && (
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        Ready — No auth needed
                      </Badge>
                    )}
                    {account.platform !== "bluesky" && (
                      <Badge variant="outline" className="text-xs">
                        API key required
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {account.handle || account.account_id}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AI Analysis Models */}
      <h3 className="mt-8 text-lg font-semibold">AI Analysis Models</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Configure API keys for AI-powered post analysis. Keys are stored securely and never exposed client-side.
      </p>

      <div className="mt-4 grid gap-4">
        {/* Claude */}
        <Card>
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#D4A574]">
                <span className="text-sm font-bold text-white">CL</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Claude (Anthropic)</span>
                  {keyStatus?.claude.configured ? (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Not configured
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {keyStatus?.claude.model || "claude-sonnet-4"}
                </span>
              </div>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="claude-key" className="text-xs text-muted-foreground">
                  API Key
                </Label>
                <Input
                  id="claude-key"
                  type="password"
                  placeholder={
                    keyStatus?.claude.configured
                      ? "Key saved — enter new key to replace"
                      : "sk-ant-..."
                  }
                  value={claudeKey}
                  onChange={(e) => setClaudeKey(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <Button
                size="sm"
                onClick={() => handleSaveKey("claude")}
                disabled={!claudeKey.trim() || savingClaude}
              >
                {savingClaude ? "Saving..." : "Save"}
              </Button>
              {keyStatus?.claude.configured && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTestKey("claude")}
                  disabled={testingClaude}
                >
                  {testingClaude ? "Testing..." : "Test"}
                </Button>
              )}
            </div>
            {feedback.claude && (
              <p
                className={`text-xs ${
                  feedback.claude.type === "success"
                    ? "text-green-600"
                    : "text-destructive"
                }`}
              >
                {feedback.claude.message}
              </p>
            )}
            {feedback.claude_test && (
              <p
                className={`text-xs ${
                  feedback.claude_test.type === "success"
                    ? "text-green-600"
                    : "text-destructive"
                }`}
              >
                {feedback.claude_test.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Gemini */}
        <Card>
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#4285F4]">
                <span className="text-sm font-bold text-white">Gm</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Gemini (Google)</span>
                  {keyStatus?.gemini.configured ? (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Not configured
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {keyStatus?.gemini.model || "gemini-3-pro-preview"}
                </span>
              </div>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="gemini-key" className="text-xs text-muted-foreground">
                  API Key
                </Label>
                <Input
                  id="gemini-key"
                  type="password"
                  placeholder={
                    keyStatus?.gemini.configured
                      ? "Key saved — enter new key to replace"
                      : "AIza..."
                  }
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <Button
                size="sm"
                onClick={() => handleSaveKey("gemini")}
                disabled={!geminiKey.trim() || savingGemini}
              >
                {savingGemini ? "Saving..." : "Save"}
              </Button>
              {keyStatus?.gemini.configured && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTestKey("gemini")}
                  disabled={testingGemini}
                >
                  {testingGemini ? "Testing..." : "Test"}
                </Button>
              )}
            </div>
            {feedback.gemini && (
              <p
                className={`text-xs ${
                  feedback.gemini.type === "success"
                    ? "text-green-600"
                    : "text-destructive"
                }`}
              >
                {feedback.gemini.message}
              </p>
            )}
            {feedback.gemini_test && (
              <p
                className={`text-xs ${
                  feedback.gemini_test.type === "success"
                    ? "text-green-600"
                    : "text-destructive"
                }`}
              >
                {feedback.gemini_test.message}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
