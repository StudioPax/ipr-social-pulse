// @component SideNav — Left sidebar navigation with mobile sheet overlay
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Megaphone,
  Radio,
  Settings,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  comingSoon: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, comingSoon: false },
  { href: "/content", label: "Content", icon: FileText, comingSoon: false },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone, comingSoon: false },
  { href: "/outreach", label: "Outreach", icon: Radio, comingSoon: true },
  { href: "/settings", label: "Settings", icon: Settings, comingSoon: false },
];

interface NavLinksProps {
  onNavigate?: () => void;
}

export function NavLinks({ onNavigate }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname?.startsWith(item.href);

        const Icon = item.icon;

        if (item.comingSoon) {
          return (
            <span
              key={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/50 cursor-default"
            >
              <Icon className="h-4 w-4 opacity-50" />
              {item.label}
              <span className="ml-auto text-[10px] font-medium uppercase tracking-wider opacity-60">
                Soon
              </span>
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150",
              isActive
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function SideNav() {
  return (
    <nav className="hidden md:flex w-60 flex-col border-r border-border bg-muted/50 px-3 py-4">
      <NavLinks />
    </nav>
  );
}
