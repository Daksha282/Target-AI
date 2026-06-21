import type { SalesRecord } from "./types";

/**
 * Sum of unitsSold in the trailing windowDays ending on `today` divided by windowDays.
 * `today` must be the latest date in the *full* salesHistory (DATA_TODAY), not the
 * per-SKU subset, so gaps at the tail of a SKU's history count against coverage.
 */
export function averageDailyDemand(
  history: SalesRecord[],
  today: string,
  windowDays: number = 28
): number {
  if (!today) return 0;

  const todayDate = new Date(today);
  const windowStart = new Date(todayDate);
  windowStart.setUTCDate(todayDate.getUTCDate() - (windowDays - 1));
  const windowStartStr = windowStart.toISOString().slice(0, 10);

  const total = history
    .filter((r) => r.date >= windowStartStr && r.date <= today)
    .reduce((sum, r) => sum + r.unitsSold, 0);

  return total / windowDays;
}

export function daysOfSupply(onHand: number, add: number): number {
  return add <= 0 ? Infinity : onHand / add;
}

export function reorderPoint(
  add: number,
  leadTimeDays: number,
  safetyStock: number
): number {
  return add * leadTimeDays + safetyStock;
}
