import type { SalesRecord, ForecastPoint } from "./types";
import { weeklyTotals } from "./weekly";

export function fourWeekForecast(history: SalesRecord[]): ForecastPoint[] {
  if (history.length === 0) return [];
  // Aggregate into ISO weeks (shared bucketing logic — see weekly.ts)
  const weekTotals = weeklyTotals(history);

  const sortedWeeks = [...weekTotals.keys()].sort();
  const last4 = sortedWeeks.slice(-4);

  const avg =
    last4.length === 0
      ? 0
      : last4.reduce((s, w) => s + (weekTotals.get(w) ?? 0), 0) / last4.length;

  // Build actuals: up to last 8 weeks
  const actualsWeeks = sortedWeeks.slice(-8);
  const actuals: ForecastPoint[] = actualsWeeks.map((w) => ({
    weekLabel: w,
    actual: weekTotals.get(w) ?? 0,
  }));

  // Project next 4 weeks
  const lastWeekLabel = sortedWeeks[sortedWeeks.length - 1] ?? "2026-W01";
  const [yearStr, weekStr] = lastWeekLabel.split("-W");
  let year = parseInt(yearStr, 10);
  let week = parseInt(weekStr, 10);

  const projected: ForecastPoint[] = [];
  for (let i = 1; i <= 4; i++) {
    week++;
    if (week > 52) {
      week = 1;
      year++;
    }
    projected.push({
      weekLabel: `${year}-W${String(week).padStart(2, "0")}`,
      projected: Math.round(avg),
    });
  }

  return [...actuals, ...projected];
}
