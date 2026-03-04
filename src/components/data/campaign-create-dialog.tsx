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
  const [authors, setAuthors] = useState("");
  const [researchUrl, setResearchUrl] = useState("");
  const [doi, setDoi] = useState("");
  const [publicationDate, setPublicationDate] = useState("");
  const [embargoDate, setEmbargoDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setTitle("");
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
    [title, authors, researchUrl, doi, publicationDate, embargoDate, clientId, onCreated, resetForm]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Campaign</DialogTitle>
          <DialogDescription>
            Create a new content campaign. You can add channels and documents
            after creation.
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
