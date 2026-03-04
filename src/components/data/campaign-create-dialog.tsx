// @component CampaignCreateDialog — Modal form for creating a new content campaign
// Posts to /api/campaigns and returns the new campaign via onCreated callback
"use client";

import { useState, useCallback, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CAMPAIGN_TYPES, CAMPAIGN_DURATIONS, CAMPAIGN_CHANNELS, TARGET_AUDIENCES } from "@/lib/tokens";

interface CampaignCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCreated: (campaign: any) => void;
}

export function CampaignCreateDialog({
  open,
  onOpenChange,
  clientId,
  onCreated,
}: CampaignCreateDialogProps) {
  const [title, setTitle] = useState("");
  const [campaignType, setCampaignType] = useState("new_research");
  const [durationWeeks, setDurationWeeks] = useState<number>(6);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
  const [authors, setAuthors] = useState("");
  const [researchUrl, setResearchUrl] = useState("");
  const [doi, setDoi] = useState("");
  const [publicationDate, setPublicationDate] = useState("");
  const [embargoDate, setEmbargoDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setTitle("");
    setCampaignType("new_research");
    setDurationWeeks(6);
    setSelectedChannels([]);
    setSelectedAudiences([]);
    setAuthors("");
    setResearchUrl("");
    setDoi("");
    setPublicationDate("");
    setEmbargoDate("");
    setError(null);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetForm();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetForm]
  );

  const toggleChannel = useCallback((channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  }, []);

  const toggleAudience = useCallback((audience: string) => {
    setSelectedAudiences((prev) =>
      prev.includes(audience) ? prev.filter((a) => a !== audience) : [...prev, audience]
    );
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);

      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        setError("Title is required.");
        return;
      }

      setSubmitting(true);

      try {
        const authorList = authors
          .split(",")
          .map((a) => a.trim())
          .filter((a) => a.length > 0);

        const body: Record<string, unknown> = {
          client_id: clientId,
          title: trimmedTitle,
          campaign_type: campaignType,
          duration_weeks: durationWeeks,
          channels_used: selectedChannels,
          target_audiences: selectedAudiences,
        };

        if (authorList.length > 0) body.research_authors = authorList;
        if (researchUrl.trim()) body.research_url = researchUrl.trim();
        if (doi.trim()) body.doi = doi.trim();
        if (publicationDate) body.publication_date = publicationDate;
        if (embargoDate) body.embargo_date = embargoDate;

        const res = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(
            errData?.error || `Request failed with status ${res.status}`
          );
        }

        const data = await res.json();
        resetForm();
        onCreated(data.campaign);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred.");
      } finally {
        setSubmitting(false);
      }
    },
    [title, campaignType, durationWeeks, selectedChannels, selectedAudiences, authors, researchUrl, doi, publicationDate, embargoDate, clientId, onCreated, resetForm]
  );

  // Find the selected type info for description
  const selectedTypeInfo = CAMPAIGN_TYPES.find((t) => t.value === campaignType);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Campaign</DialogTitle>
          <DialogDescription>
            Create a new content campaign. Add documents and generate strategy after creation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="campaign-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="campaign-title"
              placeholder="e.g. Health Equity Study 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              autoFocus
            />
          </div>

          {/* Campaign Type + Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="campaign-type">Campaign Type</Label>
              <Select value={campaignType} onValueChange={setCampaignType} disabled={submitting}>
                <SelectTrigger id="campaign-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="campaign-duration">Duration</Label>
              <Select
                value={String(durationWeeks)}
                onValueChange={(v) => setDurationWeeks(Number(v))}
                disabled={submitting}
              >
                <SelectTrigger id="campaign-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_DURATIONS.map((d) => (
                    <SelectItem key={d.value} value={String(d.value)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {selectedTypeInfo && (
            <p className="text-[11px] text-muted-foreground -mt-2">
              {selectedTypeInfo.description}
            </p>
          )}

          {/* Channels */}
          <div className="grid gap-2">
            <Label>Channels</Label>
            <div className="flex flex-wrap gap-2">
              {CAMPAIGN_CHANNELS.map((ch) => (
                <button
                  key={ch.value}
                  type="button"
                  onClick={() => toggleChannel(ch.value)}
                  disabled={submitting}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    selectedChannels.includes(ch.value)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Select channels for this campaign. Leave empty for auto-mix.
            </p>
          </div>

          {/* Target Audiences */}
          <div className="grid gap-2">
            <Label>Target Audiences</Label>
            <div className="flex flex-wrap gap-2">
              {TARGET_AUDIENCES.map((aud) => (
                <button
                  key={aud.value}
                  type="button"
                  onClick={() => toggleAudience(aud.value)}
                  disabled={submitting}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    selectedAudiences.includes(aud.value)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  {aud.label}
                </button>
              ))}
            </div>
          </div>

          {/* Authors */}
          <div className="grid gap-2">
            <Label htmlFor="campaign-authors">Authors</Label>
            <Input
              id="campaign-authors"
              placeholder="Comma-separated, e.g. Jane Doe, John Smith"
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
              disabled={submitting}
            />
            <p className="text-[11px] text-muted-foreground">
              Separate multiple authors with commas.
            </p>
          </div>

          {/* Research URL */}
          <div className="grid gap-2">
            <Label htmlFor="campaign-url">Research URL</Label>
            <Input
              id="campaign-url"
              type="url"
              placeholder="https://..."
              value={researchUrl}
              onChange={(e) => setResearchUrl(e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* DOI */}
          <div className="grid gap-2">
            <Label htmlFor="campaign-doi">DOI</Label>
            <Input
              id="campaign-doi"
              placeholder="10.1234/example"
              value={doi}
              onChange={(e) => setDoi(e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="campaign-pub-date">Publication Date</Label>
              <Input
                id="campaign-pub-date"
                type="date"
                value={publicationDate}
                onChange={(e) => setPublicationDate(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="campaign-embargo-date">Embargo Date</Label>
              <Input
                id="campaign-embargo-date"
                type="date"
                value={embargoDate}
                onChange={(e) => setEmbargoDate(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Footer */}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Campaign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
