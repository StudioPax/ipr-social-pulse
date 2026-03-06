// @layout ShareLayout — Branded header only, no nav/sidebar (for shared campaign views)
import { MeridianLogo } from "@/components/icons/meridian-logo";

export default function ShareLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background">
      {/* Branded header */}
      <header className="sticky top-0 z-40 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-full items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <MeridianLogo variant="mark" className="h-7 w-7 text-primary" />
            <MeridianLogo variant="full" className="h-5 text-foreground hidden sm:block" />
          </div>
          <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
            Shared Campaign View
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
