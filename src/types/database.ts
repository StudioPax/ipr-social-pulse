export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analysis_runs: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          model_version: string | null
          posts_analyzed: number | null
          posts_queued: number | null
          posts_skipped: number | null
          prompt_version: string | null
          run_type: string
          started_at: string | null
          status: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          model_version?: string | null
          posts_analyzed?: number | null
          posts_queued?: number | null
          posts_skipped?: number | null
          prompt_version?: string | null
          run_type?: string
          started_at?: string | null
          status?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          model_version?: string | null
          posts_analyzed?: number | null
          posts_queued?: number | null
          posts_skipped?: number | null
          prompt_version?: string | null
          run_type?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_runs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_analyses: {
        Row: {
          analyzed_at: string | null
          audience_narratives: Json
          campaign_id: string
          channel_strategy: Json
          cross_promotion_opps: string[] | null
          documents_used: Json
          embargo_notes: string | null
          faculty_engagement_plan: string | null
          fw_causal_chain: string | null
          fw_cultural_freight: string | null
          fw_solutions_framing: string | null
          fw_thematic_bridge: string | null
          fw_values_lead: string | null
          id: string
          key_findings: string[] | null
          key_messages: string[] | null
          llm_response_raw: Json | null
          model_version: string | null
          newsworthiness: string | null
          nu_alignment_mapping: string | null
          pillar_rationale: string | null
          policy_implications: string[] | null
          prompt_version: string | null
          research_summary: string | null
          timing_recommendations: string | null
        }
        Insert: {
          analyzed_at?: string | null
          audience_narratives?: Json
          campaign_id: string
          channel_strategy?: Json
          cross_promotion_opps?: string[] | null
          documents_used?: Json
          embargo_notes?: string | null
          faculty_engagement_plan?: string | null
          fw_causal_chain?: string | null
          fw_cultural_freight?: string | null
          fw_solutions_framing?: string | null
          fw_thematic_bridge?: string | null
          fw_values_lead?: string | null
          id?: string
          key_findings?: string[] | null
          key_messages?: string[] | null
          llm_response_raw?: Json | null
          model_version?: string | null
          newsworthiness?: string | null
          nu_alignment_mapping?: string | null
          pillar_rationale?: string | null
          policy_implications?: string[] | null
          prompt_version?: string | null
          research_summary?: string | null
          timing_recommendations?: string | null
        }
        Update: {
          analyzed_at?: string | null
          audience_narratives?: Json
          campaign_id?: string
          channel_strategy?: Json
          cross_promotion_opps?: string[] | null
          documents_used?: Json
          embargo_notes?: string | null
          faculty_engagement_plan?: string | null
          fw_causal_chain?: string | null
          fw_cultural_freight?: string | null
          fw_solutions_framing?: string | null
          fw_thematic_bridge?: string | null
          fw_values_lead?: string | null
          id?: string
          key_findings?: string[] | null
          key_messages?: string[] | null
          llm_response_raw?: Json | null
          model_version?: string | null
          newsworthiness?: string | null
          nu_alignment_mapping?: string | null
          pillar_rationale?: string | null
          policy_implications?: string[] | null
          prompt_version?: string | null
          research_summary?: string | null
          timing_recommendations?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_analyses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_channels: {
        Row: {
          audience_segment: string
          call_to_action: string | null
          campaign_id: string
          channel: string
          char_limit: number | null
          created_at: string | null
          hashtags: string[] | null
          id: string
          key_message_ids: number[] | null
          media_suggestion: string | null
          mentions: string[] | null
          narrative_angle: string | null
          publish_order: number | null
          published_post_id: string | null
          scheduled_date: string | null
          stage: string
          status: string
          suggested_content: string | null
          updated_at: string | null
          week_number: number | null
        }
        Insert: {
          audience_segment: string
          call_to_action?: string | null
          campaign_id: string
          channel: string
          char_limit?: number | null
          created_at?: string | null
          hashtags?: string[] | null
          id?: string
          key_message_ids?: number[] | null
          media_suggestion?: string | null
          mentions?: string[] | null
          narrative_angle?: string | null
          publish_order?: number | null
          published_post_id?: string | null
          scheduled_date?: string | null
          stage?: string
          status?: string
          suggested_content?: string | null
          updated_at?: string | null
          week_number?: number | null
        }
        Update: {
          audience_segment?: string
          call_to_action?: string | null
          campaign_id?: string
          channel?: string
          char_limit?: number | null
          created_at?: string | null
          hashtags?: string[] | null
          id?: string
          key_message_ids?: number[] | null
          media_suggestion?: string | null
          mentions?: string[] | null
          narrative_angle?: string | null
          publish_order?: number | null
          published_post_id?: string | null
          scheduled_date?: string | null
          stage?: string
          status?: string
          suggested_content?: string | null
          updated_at?: string | null
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_channels_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_channels_published_post_id_fkey"
            columns: ["published_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_documents: {
        Row: {
          campaign_id: string
          content_text: string | null
          created_at: string | null
          document_role: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_included: boolean
          sort_order: number
          source: string
          title: string
          updated_at: string | null
          word_count: number | null
        }
        Insert: {
          campaign_id: string
          content_text?: string | null
          created_at?: string | null
          document_role: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_included?: boolean
          sort_order?: number
          source?: string
          title: string
          updated_at?: string | null
          word_count?: number | null
        }
        Update: {
          campaign_id?: string
          content_text?: string | null
          created_at?: string | null
          document_role?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_included?: boolean
          sort_order?: number
          source?: string
          title?: string
          updated_at?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_documents_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          campaign_type: string
          channels_used: string[]
          client_id: string
          created_at: string | null
          created_by: string | null
          duration_weeks: number | null
          embargo_until: string | null
          id: string
          nu_alignment_tags: string[] | null
          pillar_primary: string | null
          pillar_secondary: string | null
          publication_date: string | null
          research_authors: string[] | null
          research_doi: string | null
          research_url: string | null
          start_date: string | null
          status: string
          target_audiences: string[]
          title: string
          updated_at: string | null
        }
        Insert: {
          campaign_type?: string
          channels_used?: string[]
          client_id: string
          created_at?: string | null
          created_by?: string | null
          duration_weeks?: number | null
          embargo_until?: string | null
          id?: string
          nu_alignment_tags?: string[] | null
          pillar_primary?: string | null
          pillar_secondary?: string | null
          publication_date?: string | null
          research_authors?: string[] | null
          research_doi?: string | null
          research_url?: string | null
          start_date?: string | null
          status?: string
          target_audiences?: string[]
          title: string
          updated_at?: string | null
        }
        Update: {
          campaign_type?: string
          channels_used?: string[]
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          duration_weeks?: number | null
          embargo_until?: string | null
          id?: string
          nu_alignment_tags?: string[] | null
          pillar_primary?: string | null
          pillar_secondary?: string | null
          publication_date?: string | null
          research_authors?: string[] | null
          research_doi?: string | null
          research_url?: string | null
          start_date?: string | null
          status?: string
          target_audiences?: string[]
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_settings: {
        Row: {
          client_id: string
          created_at: string
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_settings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          client_name: string
          created_at: string
          id: string
          knowledge_repo_url: string | null
          updated_at: string
        }
        Insert: {
          client_name: string
          created_at?: string
          id?: string
          knowledge_repo_url?: string | null
          updated_at?: string
        }
        Update: {
          client_name?: string
          created_at?: string
          id?: string
          knowledge_repo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      collection_runs: {
        Row: {
          client_id: string
          completed_at: string | null
          content_types: string[]
          created_at: string
          error_message: string | null
          id: string
          min_engagement: number
          platforms: string[]
          posts_collected: number | null
          started_at: string | null
          status: string
          time_range_end: string | null
          time_range_start: string | null
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          content_types?: string[]
          created_at?: string
          error_message?: string | null
          id?: string
          min_engagement?: number
          platforms?: string[]
          posts_collected?: number | null
          started_at?: string | null
          status?: string
          time_range_end?: string | null
          time_range_start?: string | null
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          content_types?: string[]
          created_at?: string
          error_message?: string | null
          id?: string
          min_engagement?: number
          platforms?: string[]
          posts_collected?: number | null
          started_at?: string | null
          status?: string
          time_range_end?: string | null
          time_range_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_runs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      post_analyses: {
        Row: {
          analysis_run_id: string | null
          analyzed_at: string
          audience_fit: string | null
          content_type: string | null
          fw_causal_chain_eval: string | null
          fw_causal_chain_score: number | null
          fw_cultural_freight_eval: string | null
          fw_cultural_freight_score: number | null
          fw_episodic_thematic_eval: string | null
          fw_episodic_thematic_score: number | null
          fw_overall_score: number | null
          fw_rewrite_rec: string | null
          fw_solutions_framing_eval: string | null
          fw_solutions_framing_score: number | null
          fw_values_lead_eval: string | null
          fw_values_lead_score: number | null
          id: string
          key_topics: string[] | null
          llm_response_raw: Json | null
          model_version: string | null
          nu_alignment_tags: string[] | null
          performance_tier: string | null
          pillar_confidence: number | null
          pillar_primary: string | null
          pillar_rationale: string | null
          pillar_secondary: string | null
          policy_relevance: number | null
          policy_relevance_rationale: string | null
          post_id: string
          prompt_version: string | null
          recommended_action: string | null
          research_authors: string[] | null
          research_confidence: number | null
          research_title: string | null
          research_url: string | null
          sentiment_confidence: number | null
          sentiment_label: string | null
          sentiment_rationale: string | null
          sentiment_score: number | null
          summary: string | null
          tier_rationale: string | null
        }
        Insert: {
          analysis_run_id?: string | null
          analyzed_at?: string
          audience_fit?: string | null
          content_type?: string | null
          fw_causal_chain_eval?: string | null
          fw_causal_chain_score?: number | null
          fw_cultural_freight_eval?: string | null
          fw_cultural_freight_score?: number | null
          fw_episodic_thematic_eval?: string | null
          fw_episodic_thematic_score?: number | null
          fw_overall_score?: number | null
          fw_rewrite_rec?: string | null
          fw_solutions_framing_eval?: string | null
          fw_solutions_framing_score?: number | null
          fw_values_lead_eval?: string | null
          fw_values_lead_score?: number | null
          id?: string
          key_topics?: string[] | null
          llm_response_raw?: Json | null
          model_version?: string | null
          nu_alignment_tags?: string[] | null
          performance_tier?: string | null
          pillar_confidence?: number | null
          pillar_primary?: string | null
          pillar_rationale?: string | null
          pillar_secondary?: string | null
          policy_relevance?: number | null
          policy_relevance_rationale?: string | null
          post_id: string
          prompt_version?: string | null
          recommended_action?: string | null
          research_authors?: string[] | null
          research_confidence?: number | null
          research_title?: string | null
          research_url?: string | null
          sentiment_confidence?: number | null
          sentiment_label?: string | null
          sentiment_rationale?: string | null
          sentiment_score?: number | null
          summary?: string | null
          tier_rationale?: string | null
        }
        Update: {
          analysis_run_id?: string | null
          analyzed_at?: string
          audience_fit?: string | null
          content_type?: string | null
          fw_causal_chain_eval?: string | null
          fw_causal_chain_score?: number | null
          fw_cultural_freight_eval?: string | null
          fw_cultural_freight_score?: number | null
          fw_episodic_thematic_eval?: string | null
          fw_episodic_thematic_score?: number | null
          fw_overall_score?: number | null
          fw_rewrite_rec?: string | null
          fw_solutions_framing_eval?: string | null
          fw_solutions_framing_score?: number | null
          fw_values_lead_eval?: string | null
          fw_values_lead_score?: number | null
          id?: string
          key_topics?: string[] | null
          llm_response_raw?: Json | null
          model_version?: string | null
          nu_alignment_tags?: string[] | null
          performance_tier?: string | null
          pillar_confidence?: number | null
          pillar_primary?: string | null
          pillar_rationale?: string | null
          pillar_secondary?: string | null
          policy_relevance?: number | null
          policy_relevance_rationale?: string | null
          post_id?: string
          prompt_version?: string | null
          recommended_action?: string | null
          research_authors?: string[] | null
          research_confidence?: number | null
          research_title?: string | null
          research_url?: string | null
          sentiment_confidence?: number | null
          sentiment_label?: string | null
          sentiment_rationale?: string | null
          sentiment_score?: number | null
          summary?: string | null
          tier_rationale?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_analyses_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_analyses_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_outreach: {
        Row: {
          action_flag: string | null
          actor_follower_count: number | null
          actor_handle: string | null
          actor_influence_score: number | null
          actor_name: string | null
          actor_type: string | null
          cited_authors: string[] | null
          cited_research_title: string | null
          content_snippet: string | null
          id: string
          outreach_type: string
          platform: string | null
          post_id: string
          published_at: string | null
        }
        Insert: {
          action_flag?: string | null
          actor_follower_count?: number | null
          actor_handle?: string | null
          actor_influence_score?: number | null
          actor_name?: string | null
          actor_type?: string | null
          cited_authors?: string[] | null
          cited_research_title?: string | null
          content_snippet?: string | null
          id?: string
          outreach_type: string
          platform?: string | null
          post_id: string
          published_at?: string | null
        }
        Update: {
          action_flag?: string | null
          actor_follower_count?: number | null
          actor_handle?: string | null
          actor_influence_score?: number | null
          actor_name?: string | null
          actor_type?: string | null
          cited_authors?: string[] | null
          cited_research_title?: string | null
          content_snippet?: string | null
          id?: string
          outreach_type?: string
          platform?: string | null
          post_id?: string
          published_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_outreach_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          authors: string[] | null
          clicks: number | null
          client_id: string
          collected_at: string
          collection_run_id: string | null
          comments: number | null
          content_format: string | null
          content_text: string | null
          content_url: string | null
          engagement_rate: number | null
          engagement_total: number | null
          hashtags: string[] | null
          id: string
          impressions: number | null
          likes: number | null
          links: string[] | null
          media_type: string | null
          media_urls: string[] | null
          mentions: string[] | null
          pillar_tag: string | null
          platform: string
          post_id: string
          published_at: string | null
          reach: number | null
          reposts: number | null
          research_ref: string | null
          saves: number | null
          shares: number | null
        }
        Insert: {
          authors?: string[] | null
          clicks?: number | null
          client_id: string
          collected_at?: string
          collection_run_id?: string | null
          comments?: number | null
          content_format?: string | null
          content_text?: string | null
          content_url?: string | null
          engagement_rate?: number | null
          engagement_total?: number | null
          hashtags?: string[] | null
          id?: string
          impressions?: number | null
          likes?: number | null
          links?: string[] | null
          media_type?: string | null
          media_urls?: string[] | null
          mentions?: string[] | null
          pillar_tag?: string | null
          platform: string
          post_id: string
          published_at?: string | null
          reach?: number | null
          reposts?: number | null
          research_ref?: string | null
          saves?: number | null
          shares?: number | null
        }
        Update: {
          authors?: string[] | null
          clicks?: number | null
          client_id?: string
          collected_at?: string
          collection_run_id?: string | null
          comments?: number | null
          content_format?: string | null
          content_text?: string | null
          content_url?: string | null
          engagement_rate?: number | null
          engagement_total?: number | null
          hashtags?: string[] | null
          id?: string
          impressions?: number | null
          likes?: number | null
          links?: string[] | null
          media_type?: string | null
          media_urls?: string[] | null
          mentions?: string[] | null
          pillar_tag?: string | null
          platform?: string
          post_id?: string
          published_at?: string | null
          reach?: number | null
          reposts?: number | null
          research_ref?: string | null
          saves?: number | null
          shares?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_collection_run_id_fkey"
            columns: ["collection_run_id"]
            isOneToOne: false
            referencedRelation: "collection_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      social_accounts: {
        Row: {
          account_id: string
          client_id: string
          created_at: string
          handle: string | null
          id: string
          is_default: boolean
          platform: string
          updated_at: string
        }
        Insert: {
          account_id: string
          client_id: string
          created_at?: string
          handle?: string | null
          id?: string
          is_default?: boolean
          platform: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          client_id?: string
          created_at?: string
          handle?: string | null
          id?: string
          is_default?: boolean
          platform?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never
