// @page Settings — Client configuration, social accounts
// App Spec §1.2 — Client Manager UI
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  useEffect(() => {
    async function load() {
      // Get default client
      const { data: clients } = await supabase
        .from("clients")
        .select("*")
        .limit(1)
        .single();

      if (clients) {
        setClient(clients);

        // Get social accounts for this client
        const { data: accts } = await supabase
          .from("social_accounts")
          .select("*")
          .eq("client_id", clients.id)
          .order("platform");

        if (accts) setAccounts(accts);
      }
      setLoading(false);
    }
    load();
  }, []);

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
        Manage client configuration and connected social accounts.
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
    </div>
  );
}
