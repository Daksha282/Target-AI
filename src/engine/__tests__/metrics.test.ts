import { describe, it, expect } from "vitest";
import { averageDailyDemand, daysOfSupply, reorderPoint } from "../metrics";
import type { SalesRecord } from "../types";

const TODAY = "2026-06-20";

function makeRecords(
  dates: string[],
  units: number,
  storeId = "T-1",
  skuId = "S-1"
): SalesRecord[] {
  return dates.map((date) => ({ storeId, skuId, date, unitsSold: units }));
}

function datesBack(anchor: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(anchor);
    d.setUTCDate(d.getUTCDate() - i);
    return d.toISOString().slice(0, 10);
  });
}

describe("averageDailyDemand", () => {
  it("returns correct average over a full 28-day window", () => {
    // 28 records × 5 units = 140 total; 140/28 = 5
    const records = makeRecords(datesBack(TODAY, 28), 5);
    expect(averageDailyDemand(records, TODAY)).toBe(5);
  });

  it("returns 0 for empty history", () => {
    expect(averageDailyDemand([], TODAY)).toBe(0);
  });

  it("excludes records outside the trailing window", () => {
    const inWindow: SalesRecord[] = [
      { storeId: "T-1", skuId: "S-1", date: TODAY, unitsSold: 280 },
    ];
    const outOfWindow: SalesRecord[] = [
      { storeId: "T-1", skuId: "S-1", date: "2026-01-01", unitsSold: 1000 },
    ];
    // Only 280 counts; 280 / 28 = 10
    expect(averageDailyDemand([...inWindow, ...outOfWindow], TODAY)).toBe(10);
  });

  it("returns 0 when all unitsSold are 0", () => {
    const records = makeRecords([TODAY, "2026-06-19"], 0);
    expect(averageDailyDemand(records, TODAY)).toBe(0);
  });

  it("reflects tail gap when SKU has no recent sales (uses TODAY not history max)", () => {
    // Last sale was 18 days before TODAY — simulates SKU-1003 gap scenario.
    // With an anchor of TODAY, the gap days reduce the average.
    const lastSaleDate = "2026-06-02"; // 18 days before 2026-06-20
    const records = makeRecords(datesBack(lastSaleDate, 10), 5); // 10 sale days × 5 = 50
    const add = averageDailyDemand(records, TODAY);
    // Window is 2026-05-24 to 2026-06-20. Records 2026-05-24..2026-06-02 (10 days × 5 = 50).
    // 50 / 28 ≈ 1.786 — NOT 5 (which would be the wrong result if anchored to lastSaleDate)
    expect(add).toBeCloseTo(50 / 28, 5);
    expect(add).toBeLessThan(2); // clearly reduced by the gap
  });
});

describe("daysOfSupply", () => {
  it("divides onHand by demand", () => {
    expect(daysOfSupply(100, 5)).toBe(20);
  });

  it("returns Infinity when demand is 0", () => {
    expect(daysOfSupply(100, 0)).toBe(Infinity);
  });

  it("returns Infinity when demand is negative", () => {
    expect(daysOfSupply(100, -1)).toBe(Infinity);
  });

  it("returns 0 when onHand is 0", () => {
    expect(daysOfSupply(0, 5)).toBe(0);
  });
});

describe("reorderPoint (suggested formula)", () => {
  it("computes add × leadTimeDays + safetyStock", () => {
    expect(reorderPoint(5, 7, 10)).toBe(45);
  });

  it("returns safetyStock when demand is 0", () => {
    expect(reorderPoint(0, 14, 20)).toBe(20);
  });
});
