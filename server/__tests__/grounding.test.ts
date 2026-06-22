import { describe, it, expect } from "vitest";
import { buildAllowedNumbers, extractNumbers, checkGrounding } from "../grounding";
import type { SkuHealth } from "../../src/engine/types";

// Minimal payload mirroring the rounded SkuHealth the client sends.
function makeHealth(over: Partial<SkuHealth> = {}): SkuHealth {
  return {
    skuId: "SKU-1001",
    storeId: "T-1442",
    sku: {
      skuId: "SKU-1001",
      name: "Up&Up Cotton Rounds 100ct",
      category: "Health",
      brandType: "owned",
      leadTimeDays: 21,
    },
    inventoryRow: {
      storeId: "T-1442",
      skuId: "SKU-1001",
      onHand: 94,
      onOrder: 0,
      reorderPoint: 210,
      safetyStock: 30,
    },
    averageDailyDemand: 9.1,
    daysOfSupply: 10.3,
    reorderPoint: 210,
    suggestedReorderPoint: 221,
    reorderQty: 244,
    forecastData: [],
    riskClass: "low-stock",
    dataQuality: "high",
    confidence: "High",
    confidenceReason: "stable",
    demandTrend: { direction: "rising", weeklyPctChange: 0.25 },
    projection: {
      projectedStockoutDate: "2026-06-25",
      orderByDate: "2026-06-04",
      overdue: true,
    },
    ...over,
  };
}

describe("buildAllowedNumbers", () => {
  it("collects payload figures plus the trend as fraction and percent", () => {
    const allowed = buildAllowedNumbers(makeHealth());
    expect(allowed).toEqual(expect.arrayContaining([94, 0, 210, 244, 10.3, 9.1, 21, 0.25, 25]));
  });

  it("drops non-finite daysOfSupply", () => {
    const allowed = buildAllowedNumbers(makeHealth({ daysOfSupply: Infinity }));
    expect(allowed.every((n) => Number.isFinite(n))).toBe(true);
  });
});

describe("extractNumbers", () => {
  it("ignores digits inside the SKU name", () => {
    expect(extractNumbers("Reorder Up&Up Cotton Rounds 100ct now", "Up&Up Cotton Rounds 100ct")).toEqual([]);
  });

  it("ignores formatted dates and percent trend figures", () => {
    const text = "Stockout by Jun 25, 2026; demand rising 25%/period. Order 244 units.";
    expect(extractNumbers(text)).toEqual([244]);
  });

  it("extracts integers and decimals", () => {
    expect(extractNumbers("days-of-supply (10.3) below 21-day lead; onHand 94")).toEqual([10.3, 21, 94]);
  });
});

describe("checkGrounding", () => {
  it("grounded: every number traces to the payload", () => {
    const text =
      "Order now because onHand (94) is below the reorder point (210); days-of-supply is 10.3 " +
      "versus the 21-day lead time. Suggested quantity 244, demand rising 25%/period. Confidence High. " +
      "Drivers: onHand 94, reorderPoint 210, leadTimeDays 21, reorderQty 244.";
    const result = checkGrounding(text, makeHealth());
    expect(result.grounded).toBe(true);
    expect(result.ungroundedNumbers).toEqual([]);
  });

  it("allows ±1 rounding tolerance", () => {
    // 95 ≈ onHand 94, 209 ≈ reorderPoint 210, 245 ≈ reorderQty 244 — all within ±1.
    const result = checkGrounding("onHand 95, reorder 209, quantity 245", makeHealth());
    expect(result.grounded).toBe(true);
  });

  it("ungrounded: flags an invented figure and de-duplicates", () => {
    const text = "Order 500 units to cover the 500-unit gap. onHand 94.";
    const result = checkGrounding(text, makeHealth());
    expect(result.grounded).toBe(false);
    expect(result.ungroundedNumbers).toEqual([500]);
  });

  it("does not flag projected dates or the trend percent", () => {
    const text =
      "Reduce exposure; demand falling 25%/period. Projected stockout Jun 25, 2026, order-by Jun 4, 2026.";
    const result = checkGrounding(text, makeHealth());
    expect(result.grounded).toBe(true);
  });
});
