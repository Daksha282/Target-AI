import type { SkuHealth, Role, ForecastPoint } from "../engine/types";
import { formatDate } from "../lib/format";

/**
 * Prose-ready restatements of Layer 1's trend/projection signals. These do NOT
 * introduce new numbers — they reformat values already present on the SkuHealth so
 * the LLM can drop them straight into a sentence without recomputing or reformatting.
 */
export interface DisplaySignals {
  /** e.g. "rising 12%/period", "falling 8%/period", or "flat". */
  demandTrend: string;
  /** e.g. "Jul 2, 2026", or "no projected stockout" when there is no finite stockout. */
  projectedStockoutDate: string;
  /** e.g. "Jun 28, 2026", or "no projected stockout" when there is no order-by date. */
  orderByDate: string;
  /** True when the order-by date is today or already past. */
  overdue: boolean;
}

/** The rounded SkuHealth carried to the LLM, plus prose-formatted signal strings. */
export interface RecommendationSkuHealth extends SkuHealth {
  display: DisplaySignals;
}

/**
 * Layer 2 boundary: this function constructs the payload that crosses from
 * Layer 1 (deterministic engine) to Layer 2 (LLM prose generation).
 *
 * The payload contains ONLY Layer 1 computed values — the LLM receives
 * pre-computed numbers and must not recalculate or invent any figure.
 * Role-tailoring happens on the server side via the system prompt.
 *
 * The engine keeps full floating-point precision internally — it is the source
 * of truth. But a raw figure like daysOfSupply = 10.167597765363128 reads as
 * machine output, not a recommendation. So at THIS boundary — and only on the
 * copy sent to the LLM — we round to the precision the UI displays. The engine's
 * values are never mutated; we change presentation, not meaning, which is exactly
 * this boundary's job.
 */
export function buildRecommendationPayload(
  skuHealth: SkuHealth,
  role: Role
): { skuHealth: RecommendationSkuHealth; role: Role } {
  const rounded = roundForDisplay(skuHealth);
  return {
    skuHealth: { ...rounded, display: buildDisplaySignals(skuHealth) },
    role,
  };
}

/** Reformats the engine's demandTrend/projection signals into prose-ready strings. */
function buildDisplaySignals(h: SkuHealth): DisplaySignals {
  const { direction, weeklyPctChange } = h.demandTrend;
  const demandTrend =
    direction === "flat"
      ? "flat"
      : `${direction} ${Math.abs(Math.round(weeklyPctChange * 100))}%/period`;

  const { projectedStockoutDate, orderByDate, overdue } = h.projection;
  return {
    demandTrend,
    projectedStockoutDate: projectedStockoutDate
      ? formatDate(projectedStockoutDate)
      : "no projected stockout",
    orderByDate: orderByDate ? formatDate(orderByDate) : "no projected stockout",
    overdue,
  };
}

/** Round to one decimal place; pass non-finite values (e.g. Infinity) through unchanged. */
function round1(n: number): number {
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : n;
}

/** Returns a new SkuHealth with display-rounded numbers. The original is never mutated. */
function roundForDisplay(h: SkuHealth): SkuHealth {
  return {
    ...h,
    averageDailyDemand: round1(h.averageDailyDemand),
    daysOfSupply: round1(h.daysOfSupply),
    reorderPoint: Math.round(h.reorderPoint),
    suggestedReorderPoint: Math.round(h.suggestedReorderPoint),
    reorderQty: Math.round(h.reorderQty),
    inventoryRow: {
      ...h.inventoryRow,
      reorderPoint: Math.round(h.inventoryRow.reorderPoint),
    },
    forecastData: h.forecastData.map(
      (p): ForecastPoint => ({
        weekLabel: p.weekLabel,
        ...(p.actual !== undefined ? { actual: Math.round(p.actual) } : {}),
        ...(p.projected !== undefined ? { projected: Math.round(p.projected) } : {}),
      })
    ),
  };
}
