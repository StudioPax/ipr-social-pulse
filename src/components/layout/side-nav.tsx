// @component SideNav — Left sidebar navigation (240px)
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/collect", label: "Collect", icon: "📥" },
  { href: "/analyze", label: "Analyze", icon: "🔬" },
  { href: "/outreach", label: "Outreach", icon: "📡" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
] as const;

export function SideNav() {
  const pathname = usePathname();

  return (
    <nav className="flex w-60 flex-col border-r border-border bg-muted/50 px-3 py-4">
      <div className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
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
    </nav>
  );
}
