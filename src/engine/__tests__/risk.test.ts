import { describe, it, expect } from "vitest";
import { classifyRisk } from "../risk";

describe("classifyRisk", () => {
  it("returns low-stock when onHand <= reorderPoint", () => {
    expect(
      classifyRisk({ onHand: 50, reorderPoint: 50, daysOfSupply: 10, leadTimeDays: 7 })
    ).toBe("low-stock");
  });

  it("returns low-stock when onHand is below reorderPoint", () => {
    expect(
      classifyRisk({ onHand: 10, reorderPoint: 100, daysOfSupply: 2, leadTimeDays: 14 })
    ).toBe("low-stock");
  });

  it("returns excess when daysOfSupply > 60 (default threshold)", () => {
    expect(
      classifyRisk({ onHand: 500, reorderPoint: 20, daysOfSupply: 100, leadTimeDays: 7 })
    ).toBe("excess");
  });

  it("returns excess when daysOfSupply > leadTimeDays * 3 (long lead time)", () => {
    // max(60, 35*3) = 105; daysOfSupply=110 > 105 → excess
    expect(
      classifyRisk({ onHand: 1000, reorderPoint: 20, daysOfSupply: 110, leadTimeDays: 35 })
    ).toBe("excess");
  });

  it("returns healthy when above reorder point and not excess", () => {
    expect(
      classifyRisk({ onHand: 200, reorderPoint: 50, daysOfSupply: 40, leadTimeDays: 7 })
    ).toBe("healthy");
  });

  it("returns healthy at the excess boundary (exactly at threshold)", () => {
    expect(
      classifyRisk({ onHand: 300, reorderPoint: 50, daysOfSupply: 60, leadTimeDays: 7 })
    ).toBe("healthy");
  });
});
