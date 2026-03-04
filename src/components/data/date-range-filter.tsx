// @component DateRangeFilter — Preset + custom date range selector for dashboard
"use client";

import { useCallback, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DATE_RANGE_PRESETS, type DateRangePreset } from "@/lib/tokens";

export interface DateRangeValue {
  preset: DateRangePreset;
  startDate: string; // ISO date string YYYY-MM-DD
  endDate: string;
}

/** Compute start/end ISO dates from a preset relative to today */
function getDateRange(preset: DateRangePreset): { startDate: string; endDate: string } {
  const now = new Date();
  const end = now.toISOString().split("T")[0];

  const start = new Date(now);
  switch (preset) {
    case "last_month":
      start.setMonth(start.getMonth() - 1);
      break;
    case "last_3_months":
      start.setMonth(start.getMonth() - 3);
      break;
    case "last_6_months":
      start.setMonth(start.getMonth() - 6);
      break;
    case "last_year":
      start.setFullYear(start.getFullYear() - 1);
      break;
    case "custom":
      // For custom, default to last 3 months as initial range
      start.setMonth(start.getMonth() - 3);
      break;
  }

  return { startDate: start.toISOString().split("T")[0], endDate: end };
}

/** Build the initial value for a given preset */
export function buildDateRangeValue(preset: DateRangePreset = "last_3_months"): DateRangeValue {
  const { startDate, endDate } = getDateRange(preset);
  return { preset, startDate, endDate };
}

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (val: DateRangeValue) => void;
}

export const DateRangeFilter = ({ value, onChange }: DateRangeFilterProps) => {
  const handlePresetChange = useCallback(
    (preset: string) => {
      const p = preset as DateRangePreset;
      if (p === "custom") {
        // Keep current dates when switching to custom
        onChange({ ...value, preset: p });
      } else {
        const { startDate, endDate } = getDateRange(p);
        onChange({ preset: p, startDate, endDate });
      }
    },
    [onChange, value]
  );

  const handleStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...value, startDate: e.target.value });
    },
    [onChange, value]
  );

  const handleEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...value, endDate: e.target.value });
    },
    [onChange, value]
  );

  const rangeLabel = useMemo(() => {
    const start = new Date(value.startDate + "T00:00:00");
    const end = new Date(value.endDate + "T00:00:00");
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    return `${fmt(start)} — ${fmt(end)}`;
  }, [value.startDate, value.endDate]);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
      <span className="text-sm font-medium text-muted-foreground">Date Range</span>

      <Select value={value.preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[180px] bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGE_PRESETS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value.preset === "custom" ? (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={value.startDate}
            onChange={handleStartChange}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <input
            type="date"
            value={value.endDate}
            onChange={handleEndChange}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      ) : (
        <span className="text-xs text-muted-foreground font-mono">{rangeLabel}</span>
      )}
    </div>
  );
};
