// @component CopyButton — Reusable copy-to-clipboard button with icon swap + toast feedback
"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  /** The text to copy to clipboard */
  text: string;
  /** Optional visible label (e.g., "Copy") */
  label?: string;
  /** Toast title on success */
  toastTitle?: string;
  /** Toast description on success */
  toastDescription?: string;
  /** Optional character count to display */
  charCount?: number | null;
  /** Optional character limit for color-coding */
  charLimit?: number | null;
  /** Additional CSS classes */
  className?: string;
  /** Button size variant */
  size?: "sm" | "icon";
}

export function CopyButton({
  text,
  label,
  toastTitle = "Copied",
  toastDescription = "Content copied to clipboard",
  charCount,
  charLimit,
  className,
  size = "sm",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: toastTitle, description: toastDescription, duration: 2000 });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard. Try selecting the text manually.",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [text, toastTitle, toastDescription, toast]);

  const Icon = copied ? Check : Copy;
  const charRatio = charCount && charLimit ? charCount / charLimit : null;
  const charColor = charRatio
    ? charRatio > 1
      ? "text-destructive"
      : charRatio > 0.9
        ? "text-yellow-500"
        : "text-muted-foreground"
    : "text-muted-foreground";

  return (
    <span className="inline-flex items-center gap-1.5">
      <Button
        variant="ghost"
        size={size}
        className={cn(
          "text-muted-foreground hover:text-foreground",
          copied && "text-green-500 hover:text-green-500",
          className
        )}
        onClick={(e) => {
          e.stopPropagation();
          handleCopy();
        }}
      >
        <Icon className="h-3.5 w-3.5" />
        {label && <span className="ml-1">{label}</span>}
      </Button>
      {charCount != null && (
        <span className={cn("text-[10px] font-mono tabular-nums", charColor)}>
          {charCount}
          {charLimit && `/${charLimit}`}
        </span>
      )}
    </span>
  );
}
