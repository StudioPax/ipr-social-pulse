// @component TopBar — App header with Meridian logo, project title, navigation
"use client";

import { MeridianLogo } from "@/components/icons/meridian-logo";

interface TopBarProps {
  clientName?: string;
}

export function TopBar({ clientName = "Northwestern IPR" }: TopBarProps) {
  return (
    <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-card px-6">
      {/* Logo + Title */}
      <div className="flex items-center gap-3">
        <MeridianLogo variant="mark" className="h-8 w-8 text-primary" />
        <div className="flex items-baseline gap-2">
          <MeridianLogo variant="full" className="h-5 hidden sm:block text-foreground" />
          <h1 className="font-display text-lg tracking-tight sm:hidden">MERIDIAN</h1>
          <span className="text-xs text-muted-foreground font-medium">/</span>
          <span className="text-sm text-muted-foreground">{clientName}</span>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right-side actions */}
      <div className="flex items-center gap-4">
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest hidden sm:block">
          Social Intelligence
        </span>
      </div>
    </header>
  );
}
