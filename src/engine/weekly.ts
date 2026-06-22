import type { SalesRecord } from "./types";

/**
 * ISO-8601 week label for a date, e.g. "2026-W25". Weeks run Monday–Sunday and the
 * year is the ISO week-year (the year of that week's Thursday).
 */
export function isoWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/**
 * The Sunday (last day) of the ISO week containing `date`, as a UTC Date. Used to
 * decide whether a week is "complete" relative to a given day.
 */
export function isoWeekEnd(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + (7 - dayNum));
  return d;
}

/**
 * Buckets sales records into ISO-week totals. This is the single source of the
 * week-bucketing logic shared by the forecast and demand-trend signals.
 */
export function weeklyTotals(history: SalesRecord[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const r of history) {
    const label = isoWeekLabel(new Date(r.date));
    totals.set(label, (totals.get(label) ?? 0) + r.unitsSold);
  }
  return totals;
}
