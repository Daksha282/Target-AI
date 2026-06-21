import type { SalesRecord, ForecastPoint } from "./types";

function isoWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function fourWeekForecast(history: SalesRecord[]): ForecastPoint[] {
  if (history.length === 0) return [];
  // Aggregate into ISO weeks
  const weekTotals = new Map<string, number>();
  for (const r of history) {
    const label = isoWeekLabel(new Date(r.date));
    weekTotals.set(label, (weekTotals.get(label) ?? 0) + r.unitsSold);
  }

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
