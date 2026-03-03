import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-8">
      <div className="text-center">
        <h1 className="font-display text-4xl tracking-tight">
          IPR Social Pulse
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          AI-powered social media intelligence for Northwestern IPR
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
            Leadership, NU Alignment, Opportunity views
          </span>
        </Link>

        <Link
          href="/collect"
          className="flex flex-col gap-2 rounded-lg border border-border bg-card p-6 transition-colors hover:bg-surface-hover"
        >
          <span className="text-2xl">📥</span>
          <span className="font-semibold">Collect</span>
          <span className="text-xs text-muted-foreground">
            Pull posts from LinkedIn, Twitter, Facebook, Instagram, Bluesky
          </span>
        </Link>

        <Link
          href="/analyze"
          className="flex flex-col gap-2 rounded-lg border border-border bg-card p-6 transition-colors hover:bg-surface-hover"
        >
          <span className="text-2xl">🔬</span>
          <span className="font-semibold">Analyze</span>
          <span className="text-xs text-muted-foreground">
            AI pillar tagging, sentiment, tiering via Claude
          </span>
        </Link>

        <Link
          href="/outreach"
          className="flex flex-col gap-2 rounded-lg border border-border bg-card p-6 transition-colors hover:bg-surface-hover"
        >
          <span className="text-2xl">📡</span>
          <span className="font-semibold">Outreach</span>
          <span className="text-xs text-muted-foreground">
            Amplifier tracking, influencer tiering, action flags
          </span>
        </Link>
      </div>
    </div>
  );
}
