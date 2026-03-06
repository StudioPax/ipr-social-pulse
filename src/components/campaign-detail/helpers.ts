// @module campaign-detail/helpers — Format/label helpers and color constants

import {
  DOCUMENT_ROLES,
  CAMPAIGN_CHANNELS,
  TARGET_AUDIENCES,
} from "@/lib/tokens";

export const ROLE_COLORS: Record<string, string> = {
  research_paper: "bg-blue-100 text-blue-800 border-blue-200",
  research_notes: "bg-amber-100 text-amber-800 border-amber-200",
  ai_brief: "bg-violet-100 text-violet-800 border-violet-200",
  supporting: "bg-slate-100 text-slate-700 border-slate-200",
};

export const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  active: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  archived: "bg-red-100 text-red-700",
};

export const CHANNEL_STATUS_COLORS: Record<string, string> = {
  planned: "bg-slate-100 text-slate-700",
  drafted: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  published: "bg-green-100 text-green-800",
  skipped: "bg-red-100 text-red-700",
};

export const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatNumber = (n: number): string => n.toLocaleString("en-US");

export const getRoleLabel = (role: string): string => {
  const found = DOCUMENT_ROLES.find((r) => r.value === role);
  return found ? found.label : role;
};

export const getChannelLabel = (channel: string): string => {
  const found = CAMPAIGN_CHANNELS.find((c) => c.value === channel);
  return found ? found.label : channel;
};

export const getAudienceLabel = (audience: string): string => {
  const found = TARGET_AUDIENCES.find((a) => a.value === audience);
  return found ? found.label : audience;
};

export const getChannelCharLimit = (channel: string): number | null => {
  const found = CAMPAIGN_CHANNELS.find((c) => c.value === channel);
  return found ? found.charLimit : null;
};

/** Build copy-ready text for a campaign deliverable */
export const buildDeliverableCopyText = (ch: {
  edited_content?: string | null;
  suggested_content?: string | null;
  hashtags?: string[] | null;
  mentions?: string[] | null;
}): string => {
  const content = ch.edited_content || ch.suggested_content || "";
  const hashtags = (ch.hashtags || []).map((t) => `#${t}`).join(" ");
  const mentions = (ch.mentions || []).map((m) => `@${m}`).join(" ");

  let text = content;
  if (hashtags) text += "\n\n" + hashtags;
  if (mentions) text += "\n" + mentions;
  return text.trim();
};
