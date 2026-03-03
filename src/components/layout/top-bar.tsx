// @component TopBar — App header with logo, project title, navigation
"use client";

interface TopBarProps {
  clientName?: string;
}

export function TopBar({ clientName = "Northwestern IPR" }: TopBarProps) {
  return (
    <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-card px-6">
      {/* Logo + Title */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
          <span className="text-sm font-bold text-primary-foreground">M</span>
        </div>
        <div className="flex items-baseline gap-2">
          <h1 className="font-display text-lg tracking-tight">MERIDIAN</h1>
          <span className="text-xs text-muted-foreground font-medium">/</span>
          <span className="text-sm text-muted-foreground">{clientName}</span>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right-side actions */}
      <div className="flex items-center gap-4">
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Social Intelligence</span>
      </div>
    </header>
  );
}
