// @component ChartSubtitle — Explanatory text below chart titles

export function ChartSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground -mt-1">{children}</p>
  );
}
