import type { SkuHealth, Role, ForecastPoint } from "../engine/types";

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
): { skuHealth: SkuHealth; role: Role } {
  return { skuHealth: roundForDisplay(skuHealth), role };
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
