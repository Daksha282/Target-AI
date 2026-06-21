import { describe, it, expect } from "vitest";
import { reorderQuantity } from "../reorder";

describe("reorderQuantity", () => {
  it("computes correct reorder quantity", () => {
    // target = 50 + 5 * 14 = 120; onHand + onOrder = 30 + 10 = 40; qty = 80
    expect(
      reorderQuantity({ onHand: 30, onOrder: 10, reorderPoint: 50, add: 5 })
    ).toBe(80);
  });

  it("returns 0 when stock already exceeds target", () => {
    expect(
      reorderQuantity({ onHand: 200, onOrder: 50, reorderPoint: 50, add: 5 })
    ).toBe(0);
  });

  it("never returns a negative quantity", () => {
    expect(
      reorderQuantity({ onHand: 9999, onOrder: 0, reorderPoint: 10, add: 1 })
    ).toBe(0);
  });

  it("uses custom cycleDays", () => {
    // target = 20 + 3 * 7 = 41; onHand+onOrder = 10; qty = 31
    expect(
      reorderQuantity({ onHand: 10, onOrder: 0, reorderPoint: 20, add: 3, cycleDays: 7 })
    ).toBe(31);
  });

  it("returns reorder point + cycle demand when onHand and onOrder are both 0", () => {
    // target = 100 + 10 * 14 = 240; available = 0; qty = 240
    expect(
      reorderQuantity({ onHand: 0, onOrder: 0, reorderPoint: 100, add: 10 })
    ).toBe(240);
  });
});
