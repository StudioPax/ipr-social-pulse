// @component SharedChannelsView — Read-only campaign plan table for shared views
"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CopyButton } from "@/components/ui/copy-button";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  CHANNEL_STATUS_COLORS,
  formatDate,
  getChannelLabel,
  getAudienceLabel,
  getChannelCharLimit,
  buildDeliverableCopyText,
} from "@/components/campaign-detail/helpers";

interface ChannelRow {
  id: string;
  channel: string;
  audience_segment: string;
  stage: string;
  status: string;
  week_number: number | null;
  scheduled_date: string | null;
  suggested_content: string | null;
  narrative_angle: string | null;
  hashtags: string[] | null;
  mentions: string[] | null;
  call_to_action: string | null;
  media_suggestion: string | null;
  char_limit: number | null;
  key_message_ids: number[] | null;
  publish_order: number | null;
}

interface SharedChannelsViewProps {
  channels: ChannelRow[];
}

export function SharedChannelsView({ channels }: SharedChannelsViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!channels.length) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        No campaign plan has been generated yet.
      </div>
    );
  }

  // Group by week
  const weekGroups: Record<number, ChannelRow[]> = {};
  channels.forEach((ch) => {
    const week = ch.week_number ?? 0;
    if (!weekGroups[week]) weekGroups[week] = [];
    weekGroups[week].push(ch);
  });
  const sortedWeeks = Object.keys(weekGroups)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {sortedWeeks.map((week) => (
        <div key={week} className="rounded-lg border border-border overflow-hidden">
          {/* Week header */}
          <div className="bg-muted/40 px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-semibold">
              {week === 0 ? "Unscheduled" : `Week ${week}`}
            </span>
            <span className="text-xs text-muted-foreground">
              {weekGroups[week].length} deliverable
              {weekGroups[week].length !== 1 ? "s" : ""}
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead className="w-8" />
                <TableHead>Channel</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weekGroups[week].map((ch) => {
                const isExpanded = expandedId === ch.id;
                const copyText = buildDeliverableCopyText(ch);
                const charCount = copyText.length;
                const charLimit = getChannelCharLimit(ch.channel);

                return (
                  <React.Fragment key={ch.id}>
                    {/* Summary row */}
                    <TableRow
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : ch.id)
                      }
                    >
                      <TableCell className="w-8 text-center">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {getChannelLabel(ch.channel)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {getAudienceLabel(ch.audience_segment)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground capitalize">
                        {ch.stage}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] capitalize",
                            CHANNEL_STATUS_COLORS[ch.status] || ""
                          )}
                        >
                          {ch.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono text-xs">
                        {formatDate(ch.scheduled_date)}
                      </TableCell>
                    </TableRow>

                    {/* Expanded content */}
                    {isExpanded && (
                      <TableRow className="bg-muted/10">
                        <TableCell colSpan={6} className="p-4">
                          <div className="space-y-4">
                            {/* Content */}
                            {ch.suggested_content && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    Content
                                  </p>
                                  <CopyButton
                                    text={copyText}
                                    toastTitle="Content copied"
                                    toastDescription="Post content copied to clipboard"
                                    charCount={charCount}
                                    charLimit={charLimit}
                                  />
                                </div>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap rounded-md border border-border bg-background p-3">
                                  {ch.suggested_content}
                                </p>
                              </div>
                            )}

                            {/* Metadata grid */}
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                              {ch.narrative_angle && (
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-0.5">
                                    Narrative Angle
                                  </p>
                                  <p className="text-sm">{ch.narrative_angle}</p>
                                </div>
                              )}
                              {ch.call_to_action && (
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-0.5">
                                    Call to Action
                                  </p>
                                  <p className="text-sm">{ch.call_to_action}</p>
                                </div>
                              )}
                              {ch.media_suggestion && (
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-0.5">
                                    Media Suggestion
                                  </p>
                                  <p className="text-sm">{ch.media_suggestion}</p>
                                </div>
                              )}
                            </div>

                            {/* Tags */}
                            {((ch.hashtags && ch.hashtags.length > 0) ||
                              (ch.mentions && ch.mentions.length > 0)) && (
                              <div className="flex flex-wrap gap-1.5">
                                {(ch.hashtags || []).map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="text-[10px]"
                                  >
                                    #{tag}
                                  </Badge>
                                ))}
                                {(ch.mentions || []).map((m) => (
                                  <Badge
                                    key={m}
                                    variant="outline"
                                    className="text-[10px]"
                                  >
                                    @{m}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}
