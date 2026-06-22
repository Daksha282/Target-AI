import type { SalesRecord, DemandTrend, Projection } from "./types";
import { isoWeekEnd, weeklyTotals } from "./weekly";

/** today + `days` days, formatted as ISO YYYY-MM-DD (UTC). */
function addDays(today: string, days: number): string {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Week-over-week demand direction from the last 6 complete ISO weeks ending at `today`.
 * Compares the mean of the most recent 3 weeks against the prior 3 weeks.
 * `weeklyPctChange` is a fraction (UI multiplies by 100). Falls back to flat/0 when
 * there are fewer than 6 complete weeks or the prior mean is 0.
 */
export function demandTrend(history: SalesRecord[], today: string): DemandTrend {
  const todayDate = new Date(today);

  // Only weeks whose Sunday is on/before `today` count as complete — drops the
  // in-progress current week so partial totals never skew the comparison.
  const complete = history.filter((r) => isoWeekEnd(new Date(r.date)) <= todayDate);
  const totals = weeklyTotals(complete);

  const last6 = [...totals.keys()].sort().slice(-6);
  if (last6.length < 6) return { direction: "flat", weeklyPctChange: 0 };

  const vals = last6.map((w) => totals.get(w) ?? 0);
  const priorMean = (vals[0] + vals[1] + vals[2]) / 3;
  const recentMean = (vals[3] + vals[4] + vals[5]) / 3;
  if (priorMean === 0) return { direction: "flat", weeklyPctChange: 0 };

  const pct = (recentMean - priorMean) / priorMean;
  const direction: DemandTrend["direction"] =
    pct > 0.05 ? "rising" : pct < -0.05 ? "falling" : "flat";

  return { direction, weeklyPctChange: Math.round(pct * 100) / 100 };
}

/**
 * Projects when stock runs out and the latest day to reorder, given days of supply
 * and lead time. Returns nulls (and overdue=false) when supply is not finite — i.e.
 * there is no demand to deplete stock.
 */
export function projectionDates(
  daysOfSupply: number,
  leadTimeDays: number,
  today: string
): Projection {
  if (!Number.isFinite(daysOfSupply)) {
    return { projectedStockoutDate: null, orderByDate: null, overdue: false };
  }

  return {
    projectedStockoutDate: addDays(today, Math.floor(daysOfSupply)),
    orderByDate: addDays(today, Math.floor(daysOfSupply - leadTimeDays)),
    overdue: daysOfSupply - leadTimeDays <= 0,
  };
}
