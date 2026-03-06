// @component TopBar — App header with Meridian logo, project title, mobile hamburger menu
"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { MeridianLogo } from "@/components/icons/meridian-logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavLinks } from "@/components/layout/side-nav";

interface TopBarProps {
  clientName?: string;
}

export function TopBar({ clientName = "Northwestern IPR" }: TopBarProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-card px-4 sm:px-6">
      {/* Mobile hamburger */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="md:hidden mr-2 h-9 w-9 p-0">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 px-3 py-4">
          <SheetHeader className="px-3 pb-4">
            <SheetTitle className="flex items-center gap-2">
              <MeridianLogo variant="mark" className="h-6 w-6 text-primary" />
              <span className="font-logo font-bold text-[15px] tracking-[0.08em]">MERIDIAN</span>
            </SheetTitle>
          </SheetHeader>
          <NavLinks onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Logo + Title */}
      <div className="flex items-center gap-3">
        <MeridianLogo variant="mark" className="h-8 w-8 text-primary" />
        <div className="flex items-baseline gap-2">
          <span className="font-logo font-bold text-xl tracking-[0.08em] text-foreground relative top-[2px]">MERIDIAN</span>
          <span className="text-xs text-muted-foreground font-medium hidden sm:inline">/</span>
          <span className="text-sm text-muted-foreground hidden sm:inline">{clientName}</span>
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
