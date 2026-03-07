/**
 * @module campaign-import — Import schema, types, and validation for campaign JSON import
 * Campaign Import Pipeline Spec v1.0
 */

import { CAMPAIGN_CHANNELS, TARGET_AUDIENCES } from "./tokens";

// ── Version ──────────────────────────────────────────────────────────────

export const CAMPAIGN_IMPORT_VERSION = "import-v1.0";

// ── Valid values (derived from tokens) ───────────────────────────────────

const VALID_CHANNELS: string[] = CAMPAIGN_CHANNELS.map((c) => c.value);
const VALID_AUDIENCES: string[] = TARGET_AUDIENCES.map((a) => a.value);
const VALID_CAMPAIGN_TYPES = [
  "new_research",
  "amplify",
  "policy_moment",
  "faculty_spotlight",
  "donor_cultivation",
] as const;
const VALID_STAGES = ["pre_launch", "rollout", "sustain", "measure"] as const;
const VALID_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

// ── Types ────────────────────────────────────────────────────────────────

export type CampaignImportType = (typeof VALID_CAMPAIGN_TYPES)[number];
export type CampaignImportStage = (typeof VALID_STAGES)[number];
export type CampaignImportDay = (typeof VALID_DAYS)[number];

export interface CampaignDeliverable {
  // Scheduling
  week_number: number;
  day_of_week: CampaignImportDay;
  publish_order: number;

  // What and where
  channel: string;
  audience_segment: string;
  stage: CampaignImportStage;

  // Content
  suggested_content: string;
  narrative_angle: string;
  call_to_action: string;
  hashtags: string[];
  mentions: string[];
  media_suggestion: string;

  // Optional
  key_message_ids?: number[];
  char_limit?: number;
}

export interface CampaignWeeklyObjective {
  week_number: number;
  objective: string;
}

export interface CampaignImportSchema {
  campaign_type: CampaignImportType;
  duration_weeks: number;
  channels_used: string[];
  deliverables: CampaignDeliverable[];
  weekly_objectives?: CampaignWeeklyObjective[];
}

// ── Validation ───────────────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
  deliverable_index?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  summary?: {
    total_deliverables: number;
    channels: string[];
    weeks: number[];
    stages: string[];
    audiences: string[];
  };
}

/**
 * Validate a parsed JSON object against the CampaignImportSchema.
 * Checks structure, field types, value constraints, and cross-field consistency.
 *
 * @param data - The parsed JSON object to validate
 * @param expectedType - The campaign_type of the target campaign (must match)
 * @param expectedDuration - The duration_weeks of the target campaign (must match)
 */
export function validateImportJSON(
  data: unknown,
  expectedType: string,
  expectedDuration: number | null
): ValidationResult {
  const errors: ValidationError[] = [];

  // ── Top-level structure ────────────────────────────────────────────────

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { valid: false, errors: [{ field: "root", message: "Must be a JSON object" }] };
  }

  const obj = data as Record<string, unknown>;

  // campaign_type
  if (!obj.campaign_type) {
    errors.push({ field: "campaign_type", message: "Required field" });
  } else if (!VALID_CAMPAIGN_TYPES.includes(obj.campaign_type as CampaignImportType)) {
    errors.push({
      field: "campaign_type",
      message: `Invalid value "${obj.campaign_type}". Must be one of: ${VALID_CAMPAIGN_TYPES.join(", ")}`,
    });
  } else if (obj.campaign_type !== expectedType) {
    errors.push({
      field: "campaign_type",
      message: `Type mismatch: JSON has "${obj.campaign_type}" but campaign expects "${expectedType}"`,
    });
  }

  // duration_weeks
  if (obj.duration_weeks === undefined || obj.duration_weeks === null) {
    errors.push({ field: "duration_weeks", message: "Required field" });
  } else if (typeof obj.duration_weeks !== "number" || !Number.isInteger(obj.duration_weeks)) {
    errors.push({ field: "duration_weeks", message: "Must be an integer" });
  } else if (obj.duration_weeks < 1 || obj.duration_weeks > 52) {
    errors.push({ field: "duration_weeks", message: "Must be between 1 and 52" });
  } else if (expectedDuration !== null && obj.duration_weeks !== expectedDuration) {
    errors.push({
      field: "duration_weeks",
      message: `Duration mismatch: JSON has ${obj.duration_weeks} but campaign expects ${expectedDuration}`,
    });
  }

  const durationWeeks = typeof obj.duration_weeks === "number" ? obj.duration_weeks : 8;

  // channels_used
  if (!Array.isArray(obj.channels_used)) {
    errors.push({ field: "channels_used", message: "Must be an array of channel strings" });
  } else {
    for (const ch of obj.channels_used) {
      if (!VALID_CHANNELS.includes(ch as string)) {
        errors.push({
          field: "channels_used",
          message: `Invalid channel "${ch}". Must be one of: ${VALID_CHANNELS.join(", ")}`,
        });
      }
    }
  }

  // weekly_objectives (optional)
  if (obj.weekly_objectives !== undefined) {
    if (!Array.isArray(obj.weekly_objectives)) {
      errors.push({ field: "weekly_objectives", message: "Must be an array of { week_number, objective } objects" });
    } else {
      for (let i = 0; i < obj.weekly_objectives.length; i++) {
        const wo = obj.weekly_objectives[i] as Record<string, unknown>;
        if (typeof wo.week_number !== "number" || !Number.isInteger(wo.week_number)) {
          errors.push({ field: `weekly_objectives[${i}].week_number`, message: "Must be an integer" });
        } else if (wo.week_number < 1 || wo.week_number > durationWeeks) {
          errors.push({ field: `weekly_objectives[${i}].week_number`, message: `Must be between 1 and ${durationWeeks}` });
        }
        if (typeof wo.objective !== "string" || wo.objective.trim() === "") {
          errors.push({ field: `weekly_objectives[${i}].objective`, message: "Required, non-empty string" });
        }
      }
    }
  }

  // deliverables
  if (!Array.isArray(obj.deliverables)) {
    errors.push({ field: "deliverables", message: "Must be an array" });
    return { valid: false, errors };
  }

  if (obj.deliverables.length === 0) {
    errors.push({ field: "deliverables", message: "Must have at least 1 deliverable" });
    return { valid: false, errors };
  }

  // ── Per-deliverable validation ─────────────────────────────────────────

  const channelsUsed = new Set<string>();
  const weeksUsed = new Set<number>();
  const stagesUsed = new Set<string>();
  const audiencesUsed = new Set<string>();

  for (let i = 0; i < obj.deliverables.length; i++) {
    const d = obj.deliverables[i] as Record<string, unknown>;
    const prefix = `deliverables[${i}]`;

    // week_number
    if (d.week_number === undefined || d.week_number === null) {
      errors.push({ field: `${prefix}.week_number`, message: "Required", deliverable_index: i });
    } else if (typeof d.week_number !== "number" || !Number.isInteger(d.week_number)) {
      errors.push({ field: `${prefix}.week_number`, message: "Must be an integer", deliverable_index: i });
    } else if (d.week_number < 1 || d.week_number > durationWeeks) {
      errors.push({
        field: `${prefix}.week_number`,
        message: `Must be between 1 and ${durationWeeks}`,
        deliverable_index: i,
      });
    } else {
      weeksUsed.add(d.week_number);
    }

    // day_of_week
    if (!d.day_of_week) {
      errors.push({ field: `${prefix}.day_of_week`, message: "Required", deliverable_index: i });
    } else if (!VALID_DAYS.includes(d.day_of_week as CampaignImportDay)) {
      errors.push({
        field: `${prefix}.day_of_week`,
        message: `Invalid value "${d.day_of_week}". Must be one of: ${VALID_DAYS.join(", ")}`,
        deliverable_index: i,
      });
    }

    // publish_order
    if (d.publish_order !== undefined && d.publish_order !== null) {
      if (typeof d.publish_order !== "number" || !Number.isInteger(d.publish_order)) {
        errors.push({ field: `${prefix}.publish_order`, message: "Must be an integer", deliverable_index: i });
      }
    }

    // channel
    if (!d.channel) {
      errors.push({ field: `${prefix}.channel`, message: "Required", deliverable_index: i });
    } else if (!VALID_CHANNELS.includes(d.channel as string)) {
      errors.push({
        field: `${prefix}.channel`,
        message: `Invalid channel "${d.channel}"`,
        deliverable_index: i,
      });
    } else {
      channelsUsed.add(d.channel as string);
    }

    // audience_segment
    if (!d.audience_segment) {
      errors.push({ field: `${prefix}.audience_segment`, message: "Required", deliverable_index: i });
    } else if (!VALID_AUDIENCES.includes(d.audience_segment as string)) {
      errors.push({
        field: `${prefix}.audience_segment`,
        message: `Invalid audience "${d.audience_segment}"`,
        deliverable_index: i,
      });
    } else {
      audiencesUsed.add(d.audience_segment as string);
    }

    // stage
    if (!d.stage) {
      errors.push({ field: `${prefix}.stage`, message: "Required", deliverable_index: i });
    } else if (!VALID_STAGES.includes(d.stage as CampaignImportStage)) {
      errors.push({
        field: `${prefix}.stage`,
        message: `Invalid stage "${d.stage}". Must be one of: ${VALID_STAGES.join(", ")}`,
        deliverable_index: i,
      });
    } else {
      stagesUsed.add(d.stage as string);
    }

    // Content fields (required strings)
    for (const field of ["suggested_content", "narrative_angle", "call_to_action"] as const) {
      if (!d[field] || typeof d[field] !== "string" || (d[field] as string).trim() === "") {
        errors.push({
          field: `${prefix}.${field}`,
          message: "Required, non-empty string",
          deliverable_index: i,
        });
      }
    }

    // media_suggestion (required string)
    if (!d.media_suggestion || typeof d.media_suggestion !== "string") {
      errors.push({
        field: `${prefix}.media_suggestion`,
        message: "Required string",
        deliverable_index: i,
      });
    }

    // hashtags (array of strings)
    if (d.hashtags !== undefined && !Array.isArray(d.hashtags)) {
      errors.push({ field: `${prefix}.hashtags`, message: "Must be an array of strings", deliverable_index: i });
    }

    // mentions (array of strings)
    if (d.mentions !== undefined && !Array.isArray(d.mentions)) {
      errors.push({ field: `${prefix}.mentions`, message: "Must be an array of strings", deliverable_index: i });
    }
  }

  // ── Build summary ─────────────────────────────────────────────────────

  const summary = {
    total_deliverables: obj.deliverables.length,
    channels: Array.from(channelsUsed).sort(),
    weeks: Array.from(weeksUsed).sort((a, b) => a - b),
    stages: Array.from(stagesUsed),
    audiences: Array.from(audiencesUsed).sort(),
  };

  return {
    valid: errors.length === 0,
    errors,
    summary,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Get the char limit for a given channel from CAMPAIGN_CHANNELS.
 */
export function getChannelCharLimit(channel: string): number | null {
  const found = CAMPAIGN_CHANNELS.find((c) => c.value === channel);
  return found?.charLimit ?? null;
}

/**
 * Transform a validated CampaignImportSchema into campaign_channels insert rows.
 */
export function toChannelInserts(
  campaignId: string,
  data: CampaignImportSchema
): Array<{
  campaign_id: string;
  channel: string;
  audience_segment: string;
  stage: string;
  week_number: number;
  publish_order: number;
  suggested_content: string;
  narrative_angle: string;
  call_to_action: string;
  hashtags: string[];
  mentions: string[];
  media_suggestion: string;
  char_limit: number | null;
  key_message_ids: number[] | null;
  status: string;
}> {
  return data.deliverables.map((d) => ({
    campaign_id: campaignId,
    channel: d.channel,
    audience_segment: d.audience_segment,
    stage: d.stage,
    week_number: d.week_number,
    publish_order: d.publish_order || 1,
    suggested_content: d.suggested_content,
    narrative_angle: d.narrative_angle || "",
    call_to_action: d.call_to_action || "",
    hashtags: d.hashtags || [],
    mentions: d.mentions || [],
    media_suggestion: d.media_suggestion || "",
    char_limit: d.char_limit ?? getChannelCharLimit(d.channel),
    key_message_ids: d.key_message_ids || null,
    status: "planned",
  }));
}
