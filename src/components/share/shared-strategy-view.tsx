// @component SharedStrategyView — Read-only strategy display for shared campaign views
"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { getAudienceLabel } from "@/components/campaign-detail/helpers";

/* FrameWorks Messaging Guidance fields */
const MESSAGING_FIELDS = [
  { key: "fw_values_lead", label: "Values Lead" },
  { key: "fw_causal_chain", label: "Causal Chain" },
  { key: "fw_solutions_framing", label: "Solutions Framing" },
  { key: "fw_thematic_bridge", label: "Thematic Bridge" },
  { key: "fw_cultural_freight", label: "Cultural Freight" },
] as const;

interface AudienceNarrative {
  hook: string;
  framing: string;
  key_stat: string;
  call_to_action: string;
  tone: string;
}

interface SharedStrategyViewProps {
  analysis: {
    research_summary: string | null;
    key_messages: string[] | null;
    fw_values_lead: string | null;
    fw_causal_chain: string | null;
    fw_solutions_framing: string | null;
    fw_thematic_bridge: string | null;
    fw_cultural_freight: string | null;
    audience_narratives: Record<string, AudienceNarrative> | null;
  };
}

export function SharedStrategyView({ analysis }: SharedStrategyViewProps) {
  if (!analysis) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        No strategy has been generated for this campaign yet.
      </div>
    );
  }

  const narratives = (analysis.audience_narratives || {}) as Record<string, AudienceNarrative>;
  const narrativeEntries = Object.entries(narratives);

  return (
    <div className="space-y-6">
      {/* Research Summary */}
      {analysis.research_summary && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Research Summary</CardTitle>
              <CopyButton
                text={analysis.research_summary}
                toastTitle="Summary copied"
              />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {analysis.research_summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Key Messages */}
      {analysis.key_messages && analysis.key_messages.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Key Messages</CardTitle>
              <CopyButton
                text={analysis.key_messages
                  .map((m, i) => `${i + 1}. ${m}`)
                  .join("\n")}
                toastTitle="Messages copied"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {analysis.key_messages.map((msg, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed">
                  <Badge
                    variant="outline"
                    className="mt-0.5 h-5 w-5 shrink-0 items-center justify-center rounded-full p-0 text-[10px] font-mono"
                  >
                    {i + 1}
                  </Badge>
                  <span>{msg}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Messaging Guidance (FrameWorks) */}
      {MESSAGING_FIELDS.some(
        (f) => analysis[f.key as keyof typeof analysis]
      ) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Messaging Guidance</CardTitle>
              <CopyButton
                text={MESSAGING_FIELDS.filter(
                  (f) => analysis[f.key as keyof typeof analysis]
                )
                  .map(
                    (f) =>
                      `${f.label.toUpperCase()}: ${analysis[f.key as keyof typeof analysis]}`
                  )
                  .join("\n\n")}
                toastTitle="Guidance copied"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {MESSAGING_FIELDS.map((field) => {
                const value = analysis[field.key as keyof typeof analysis] as string | null;
                if (!value) return null;
                return (
                  <div key={field.key}>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                      {field.label}
                    </p>
                    <p className="text-sm leading-relaxed">{value}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audience Narratives */}
      {narrativeEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Audience Narratives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {narrativeEntries.map(([audience, narrative]) => (
                <div key={audience} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {getAudienceLabel(audience)}
                    </Badge>
                    <CopyButton
                      text={[
                        `HOOK: ${narrative.hook}`,
                        `FRAMING: ${narrative.framing}`,
                        `KEY STAT: ${narrative.key_stat}`,
                        `CALL TO ACTION: ${narrative.call_to_action}`,
                        `TONE: ${narrative.tone}`,
                      ].join("\n\n")}
                      toastTitle="Narrative copied"
                    />
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Hook", value: narrative.hook },
                      { label: "Framing", value: narrative.framing },
                      { label: "Key Stat", value: narrative.key_stat },
                      { label: "Call to Action", value: narrative.call_to_action },
                      { label: "Tone", value: narrative.tone },
                    ].map(({ label, value }) =>
                      value ? (
                        <div key={label}>
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-0.5">
                            {label}
                          </p>
                          <p className="text-sm leading-relaxed">{value}</p>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
