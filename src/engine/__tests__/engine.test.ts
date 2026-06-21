import { describe, it, expect } from "vitest";
import { runEngine } from "../engine";
import type { Store, Sku, InventoryRow, SalesRecord } from "../types";

const TODAY = "2026-06-20";

const stores: Store[] = [{ storeId: "T-1", name: "Test Store", region: "Midwest" }];

const skus: Sku[] = [
  { skuId: "S-1", name: "Widget A", category: "Home", brandType: "national", leadTimeDays: 7 },
  { skuId: "S-2", name: "Widget B", category: "Grocery", brandType: "owned", leadTimeDays: 21 },
  { skuId: "S-3", name: "Widget C", category: "Apparel", brandType: "owned", leadTimeDays: 14 },
];

// S-1: healthy — onHand(200) > storedRP(50), daysOfSupply moderate
// S-2: low-stock — onHand(5) <= storedRP(200)
// S-3: gap SKU — onHand above storedRP, but 18-day sales gap → low data quality
const inventory: InventoryRow[] = [
  { storeId: "T-1", skuId: "S-1", onHand: 200, onOrder: 0,  reorderPoint: 50,  safetyStock: 10 },
  { storeId: "T-1", skuId: "S-2", onHand: 5,   onOrder: 0,  reorderPoint: 200, safetyStock: 20 },
  { storeId: "T-1", skuId: "S-3", onHand: 500, onOrder: 0,  reorderPoint: 40,  safetyStock: 10 },
];

function makeDailySales(
  skuId: string,
  anchor: string,
  days: number,
  units: number,
  storeId = "T-1"
): SalesRecord[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(anchor);
    d.setUTCDate(d.getUTCDate() - i);
    return { storeId, skuId, date: d.toISOString().slice(0, 10), unitsSold: units };
  });
}

// S-3 last sold 18 days before TODAY
const gapLastSale = "2026-06-02";

const salesHistory: SalesRecord[] = [
  ...makeDailySales("S-1", TODAY, 60, 5),
  ...makeDailySales("S-2", TODAY, 60, 10),
  ...makeDailySales("S-3", gapLastSale, 42, 8), // gap of 18 days before TODAY
];

describe("runEngine", () => {
  it("returns one SkuHealth per inventory row", () => {
    expect(runEngine(stores, skus, inventory, salesHistory)).toHaveLength(3);
  });

  it("S-1: correctly identifies healthy SKU using stored reorderPoint", () => {
    const result = runEngine(stores, skus, inventory, salesHistory);
    const s1 = result.find((r) => r.skuId === "S-1")!;
    expect(s1.riskClass).toBe("healthy");
    // reorderPoint in SkuHealth must be the stored value, not the computed suggestion
    expect(s1.reorderPoint).toBe(50);
  });

  it("S-2: correctly identifies low-stock SKU (onHand <= stored reorderPoint)", () => {
    const result = runEngine(stores, skus, inventory, salesHistory);
    const s2 = result.find((r) => r.skuId === "S-2")!;
    expect(s2.riskClass).toBe("low-stock");
    expect(s2.reorderPoint).toBe(200); // operative = stored
  });

  it("S-3: 18-day gap trips low dataQuality and lowers confidence", () => {
    const result = runEngine(stores, skus, inventory, salesHistory);
    const s3 = result.find((r) => r.skuId === "S-3")!;
    // 18-day gap means < 10 days of sales in trailing 28-day window → low coverage
    expect(s3.dataQuality).toBe("low");
    expect(s3.confidence).toBe("Low");
    expect(s3.confidenceReason.length).toBeGreaterThan(0);
  });

  it("suggestedReorderPoint is computed separately from operative reorderPoint", () => {
    const result = runEngine(stores, skus, inventory, salesHistory);
    const s1 = result.find((r) => r.skuId === "S-1")!;
    // add ≈ 5, leadTime = 7, safetyStock = 10 → suggested = 5*7+10 = 45
    expect(s1.suggestedReorderPoint).toBeCloseTo(45, 0);
    // operative must still be 50 (from inventory)
    expect(s1.reorderPoint).toBe(50);
  });

  it("produces no NaN in numeric fields", () => {
    const result = runEngine(stores, skus, inventory, salesHistory);
    for (const h of result) {
      expect(isNaN(h.averageDailyDemand)).toBe(false);
      expect(isNaN(h.reorderPoint)).toBe(false);
      expect(isNaN(h.suggestedReorderPoint)).toBe(false);
      expect(isNaN(h.reorderQty)).toBe(false);
    }
  });

  it("daysOfSupply is Infinity when there are zero sales", () => {
    const result = runEngine(stores, skus, inventory, []);
    for (const h of result) {
      expect(h.daysOfSupply).toBe(Infinity);
    }
  });

  it("reorderQty is never negative", () => {
    const result = runEngine(stores, skus, inventory, salesHistory);
    for (const h of result) {
      expect(h.reorderQty).toBeGreaterThanOrEqual(0);
    }
  });

  it("category override replaces stored reorderPoint as operative RP", () => {
    const result = runEngine(stores, skus, inventory, salesHistory, { Home: 999 });
    const s1 = result.find((r) => r.skuId === "S-1")!;
    expect(s1.reorderPoint).toBe(999);       // override applied
    expect(s1.riskClass).toBe("low-stock");  // 200 <= 999
    // Grocery SKU not affected by Home override
    const s2 = result.find((r) => r.skuId === "S-2")!;
    expect(s2.reorderPoint).toBe(200);       // still uses stored value
  });

  it("suggestedReorderPoint is not affected by category overrides", () => {
    const result = runEngine(stores, skus, inventory, salesHistory, { Home: 999 });
    const s1 = result.find((r) => r.skuId === "S-1")!;
    // suggestedRP = formula only; override must not bleed into it
    expect(s1.suggestedReorderPoint).toBeCloseTo(45, 0);
    expect(s1.reorderPoint).toBe(999); // operative is the override
  });
});
