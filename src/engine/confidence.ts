import type { SalesRecord, DataQuality, Confidence } from "./types";

/**
 * Fraction of calendar days in the trailing windowDays (ending on `today`) that
 * have at least one sales record. `today` must be DATA_TODAY — the tail gap of a
 * SKU that stopped selling early would otherwise not reduce coverage.
 */
export function dataQuality(
  history: SalesRecord[],
  today: string,
  windowDays: number = 28
): DataQuality {
  if (history.length === 0 || !today) return "low";

  const todayDate = new Date(today);
  const windowStart = new Date(todayDate);
  windowStart.setUTCDate(todayDate.getUTCDate() - (windowDays - 1));
  const windowStartStr = windowStart.toISOString().slice(0, 10);

  const daysWithData = new Set(
    history
      .filter((r) => r.date >= windowStartStr && r.date <= today)
      .map((r) => r.date)
  ).size;

  const coverage = daysWithData / windowDays;
  if (coverage >= 0.85) return "high";
  if (coverage >= 0.6) return "medium";
  return "low";
}

interface ConfidenceInput {
  dq: DataQuality;
  history: SalesRecord[];
}

export function confidence({ dq, history }: ConfidenceInput): {
  level: Confidence;
  reason: string;
} {
  const weekTotals = new Map<string, number>();
  for (const r of history) {
    const d = new Date(r.date);
    const dayNum = d.getUTCDay() || 7;
    const thursday = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 4 - dayNum)
    );
    const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(
      ((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
    );
    const label = `${thursday.getUTCFullYear()}-W${weekNo}`;
    weekTotals.set(label, (weekTotals.get(label) ?? 0) + r.unitsSold);
  }

  const weeks = [...weekTotals.values()];
  if (weeks.length < 2) {
    return { level: "Low", reason: "Insufficient history for variability estimate." };
  }

  const mean = weeks.reduce((s, v) => s + v, 0) / weeks.length;
  const variance = weeks.reduce((s, v) => s + (v - mean) ** 2, 0) / weeks.length;
  const cv = mean === 0 ? Infinity : Math.sqrt(variance) / mean;
  const highVariability = cv > 0.5;

  if (dq === "high" && !highVariability) {
    return { level: "High", reason: "Good data coverage and stable weekly demand." };
  }
  if (dq === "low" || (dq === "medium" && highVariability)) {
    return {
      level: "Low",
      reason:
        dq === "low"
          ? "Sparse sales history — data coverage below 60%."
          : "Moderate coverage combined with high demand variability.",
    };
  }
  return {
    level: "Medium",
    reason: highVariability
      ? "Sufficient coverage but demand is volatile (CV > 0.5)."
      : "Partial data coverage limits forecast reliability.",
  };
}
