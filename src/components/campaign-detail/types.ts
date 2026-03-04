// @module campaign-detail/types — Shared TypeScript interfaces for campaign detail tabs

export interface Campaign {
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

export interface ImportPreview {
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

export interface SSELogEntry {
  level: string;
  message: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface CampaignDocument {
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

export interface CampaignChannel {
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

export interface AudienceNarrative {
  hook: string;
  framing: string;
  key_stat: string;
  call_to_action: string;
  tone: string;
}

export interface ChannelStrategy {
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

export interface StrategyOutput {
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

export interface CampaignAnalysis {
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

export interface CampaignData {
  campaign: Campaign;
  documents: CampaignDocument[];
  channels: CampaignChannel[];
  analysis: CampaignAnalysis | null;
}

export interface ChannelEditForm {
  content: string;
  status: string;
  hashtags: string;
  mentions: string;
  media_suggestion: string;
}
