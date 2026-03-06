// @component SideNav — Left sidebar navigation with mobile sheet overlay
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊", comingSoon: false },
  { href: "/content", label: "Content", icon: "📄", comingSoon: false },
  { href: "/campaigns", label: "Campaigns", icon: "📋", comingSoon: false },
  { href: "/outreach", label: "Outreach", icon: "📡", comingSoon: true },
  { href: "/settings", label: "Settings", icon: "⚙️", comingSoon: false },
] as const;

interface NavLinksProps {
  onNavigate?: () => void;
}

export function NavLinks({ onNavigate }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname?.startsWith(item.href);

        if (item.comingSoon) {
          return (
            <span
              key={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/50 cursor-default"
            >
              <span className="text-base opacity-50">{item.icon}</span>
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
            <span className="text-base">{item.icon}</span>
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
