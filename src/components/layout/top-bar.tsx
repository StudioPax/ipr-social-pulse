// @component TopBar — App header with logo, project title, navigation
"use client";

interface TopBarProps {
  clientName?: string;
}

export function TopBar({ clientName = "IPR Social Pulse" }: TopBarProps) {
  return (
    <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-card px-6">
      {/* Logo + Title */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
          <span className="text-sm font-bold text-primary-foreground">SP</span>
        </div>
        <h1 className="font-display text-lg tracking-tight">{clientName}</h1>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right-side actions */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground">Northwestern IPR</span>
      </div>
    </header>
  );
}
