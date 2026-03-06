// @layout AppLayout — Main app shell with TopBar + SideNav (excludes /share routes)
import { TopBar } from "@/components/layout/top-bar";
import { SideNav } from "@/components/layout/side-nav";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* UI Spec §4 — Page Shell */}
      <TopBar />
      <div className="flex h-[calc(100vh-3.5rem)]">
        <SideNav />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </>
  );
}
