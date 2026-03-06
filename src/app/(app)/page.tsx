import Link from "next/link";
import { MeridianLogo } from "@/components/icons/meridian-logo";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-8">
      <div className="flex flex-col items-center text-center">
        <MeridianLogo variant="mark" className="h-16 w-16 text-primary mb-4" />
        <MeridianLogo variant="full" className="h-8 text-foreground" />
        <p className="mt-3 text-sm font-medium text-muted-foreground tracking-wide uppercase">
          Northwestern IPR
        </p>
        <p className="mt-2 text-lg text-muted-foreground">
          AI-powered social media intelligence platform
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-lg w-full">
        <Link
          href="/dashboard"
          className="flex flex-col gap-2 rounded-lg border border-border bg-card p-6 transition-colors hover:bg-surface-hover"
        >
          <span className="text-2xl">📊</span>
          <span className="font-semibold">Dashboard</span>
          <span className="text-xs text-muted-foreground">
            Ecosystem health, pillar distribution, engagement trends
          </span>
        </Link>

        <Link
          href="/content"
          className="flex flex-col gap-2 rounded-lg border border-border bg-card p-6 transition-colors hover:bg-surface-hover"
        >
          <span className="text-2xl">📄</span>
          <span className="font-semibold">Content</span>
          <span className="text-xs text-muted-foreground">
            Browse, import, analyze, and manage your content
          </span>
        </Link>

        <Link
          href="/campaigns"
          className="flex flex-col gap-2 rounded-lg border border-border bg-card p-6 transition-colors hover:bg-surface-hover"
        >
          <span className="text-2xl">📋</span>
          <span className="font-semibold">Campaigns</span>
          <span className="text-xs text-muted-foreground">
            AI strategy, content calendars, multi-channel plans
          </span>
        </Link>

        <div
          className="flex flex-col gap-2 rounded-lg border border-border bg-card p-6 opacity-50 cursor-default"
        >
          <span className="text-2xl">📡</span>
          <span className="font-semibold">Outreach</span>
          <span className="text-xs text-muted-foreground">
            Amplifier tracking, influencer tiering — coming soon
          </span>
        </div>
      </div>
    </div>
  );
}
