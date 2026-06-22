import type { SalesRecord, ForecastPoint } from "./types";
import { weeklyTotals, isoWeekEnd } from "./weekly";

// Holt's linear method (double exponential smoothing) — Holt, C.C. (1957),
// "Forecasting seasonals and trends by exponentially weighted moving averages".
// ALPHA smooths the level, BETA smooths the trend.
const ALPHA = 0.5;
const BETA = 0.3;

// Need at least this many complete weeks for a meaningful level+trend fit;
// below it we fall back to a flat average (the legacy behavior).
const MIN_TRAINING_WEEKS = 3;
const PROJECTION_WEEKS = 4;
const ACTUAL_WEEKS = 8;

/**
 * Weekly demand forecast: up to 8 actual ISO-week totals followed by 4 projected
 * weeks. Projection uses Holt's linear method so it slopes with demand instead of
 * flat-lining. `today` excludes the in-progress (partial) trailing week from the
 * training series — a 1-day bucket would otherwise drag the trend — while that week
 * still renders as an actual.
 */
export function fourWeekForecast(history: SalesRecord[], today: string): ForecastPoint[] {
  if (history.length === 0) return [];

  // Actuals: every bucketed week (shared bucketing — see weekly.ts), last 8 shown.
  const allWeeks = weeklyTotals(history);
  const sortedWeeks = [...allWeeks.keys()].sort();
  const actualsWeeks = sortedWeeks.slice(-ACTUAL_WEEKS);
  const actuals: ForecastPoint[] = actualsWeeks.map((w) => ({
    weekLabel: w,
    actual: allWeeks.get(w) ?? 0,
  }));

  // Training series: complete (7-day) weeks only — drop the partial current week,
  // exactly as the demand-trend signal does (isoWeekEnd <= today).
  const todayDate = new Date(today);
  const completeTotals = weeklyTotals(
    history.filter((r) => isoWeekEnd(new Date(r.date)) <= todayDate)
  );
  const y = [...completeTotals.keys()]
    .sort()
    .slice(-ACTUAL_WEEKS)
    .map((w) => completeTotals.get(w) ?? 0);

  const projectedValues =
    y.length >= MIN_TRAINING_WEEKS ? holtProject(y) : flatProject(y, actuals);

  // Labels: continue ISO-week numbering from the last shown actual week.
  const lastWeekLabel = sortedWeeks[sortedWeeks.length - 1] ?? "2026-W01";
  const [yearStr, weekStr] = lastWeekLabel.split("-W");
  let year = parseInt(yearStr, 10);
  let week = parseInt(weekStr, 10);

  const projected: ForecastPoint[] = projectedValues.map((value) => {
    week++;
    if (week > 52) {
      week = 1;
      year++;
    }
    return { weekLabel: `${year}-W${String(week).padStart(2, "0")}`, projected: value };
  });

  return [...actuals, ...projected];
}

/** Holt's linear method: returns 4 projected weekly totals, clamped at 0. */
function holtProject(y: number[]): number[] {
  let level = y[0];
  let trend = y.length >= 2 ? y[1] - y[0] : 0;

  for (let t = 1; t < y.length; t++) {
    const prevLevel = level;
    level = ALPHA * y[t] + (1 - ALPHA) * (prevLevel + trend);
    trend = BETA * (level - prevLevel) + (1 - BETA) * trend;
  }

  const out: number[] = [];
  for (let h = 1; h <= PROJECTION_WEEKS; h++) {
    out.push(Math.max(0, Math.round(level + h * trend)));
  }
  return out;
}

/** Legacy fallback for sparse data: flat projection at the average weekly total. */
function flatProject(y: number[], actuals: ForecastPoint[]): number[] {
  const source = y.length > 0 ? y : actuals.map((p) => p.actual ?? 0);
  const avg =
    source.length === 0 ? 0 : source.reduce((s, n) => s + n, 0) / source.length;
  const flat = Math.max(0, Math.round(avg));
  return Array.from({ length: PROJECTION_WEEKS }, () => flat);
}
