import { describe, it, expect } from "vitest";
import { dataQuality, confidence } from "../confidence";
import type { SalesRecord } from "../types";

const TODAY = "2026-06-20";

function makeRecords(dates: string[], units: number): SalesRecord[] {
  return dates.map((date) => ({ storeId: "T-1", skuId: "S-1", date, unitsSold: units }));
}

function datesBack(anchor: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(anchor);
    d.setUTCDate(d.getUTCDate() - i);
    return d.toISOString().slice(0, 10);
  });
}

describe("dataQuality", () => {
  it("returns high when coverage >= 85% (28/28 = 100%)", () => {
    expect(dataQuality(makeRecords(datesBack(TODAY, 28), 5), TODAY)).toBe("high");
  });

  it("returns medium when coverage is 60–84% (20/28 ≈ 71%)", () => {
    // 20 records ending on TODAY → 20/28 coverage
    expect(dataQuality(makeRecords(datesBack(TODAY, 20), 5), TODAY)).toBe("medium");
  });

  it("returns low when coverage < 60% (10/28 ≈ 36%)", () => {
    expect(dataQuality(makeRecords(datesBack(TODAY, 10), 5), TODAY)).toBe("low");
  });

  it("returns low for empty history", () => {
    expect(dataQuality([], TODAY)).toBe("low");
  });

  it("counts tail gap against coverage when anchored to TODAY (SKU-1003 scenario)", () => {
    // Last sale 18 days before TODAY; only 10 sale days within the 28-day window.
    // Without the TODAY anchor the old code would use "2026-06-02" as cutoff and
    // score those 10 days as 10/28 ≈ 36% — but anchored correctly it should be the same.
    // The key assertion: a SKU with no sales in the last 18 days must NOT score "high".
    const lastSale = "2026-06-02";
    const records = makeRecords(datesBack(lastSale, 10), 5);
    const quality = dataQuality(records, TODAY);
    expect(quality).not.toBe("high");
    expect(quality).toBe("low"); // 10/28 ≈ 36%
  });

  it("all 28 records present but none in window returns low", () => {
    // Records exist but all before the 28-day window
    const oldDates = datesBack("2026-01-01", 28);
    expect(dataQuality(makeRecords(oldDates, 5), TODAY)).toBe("low");
  });
});

describe("confidence", () => {
  it("returns High for high quality + stable demand", () => {
    const history = makeRecords(datesBack(TODAY, 60), 10);
    expect(confidence({ dq: "high", history }).level).toBe("High");
  });

  it("returns Low when data quality is low", () => {
    const history = makeRecords(datesBack(TODAY, 5), 10);
    expect(confidence({ dq: "low", history }).level).toBe("Low");
  });

  it("returns Low with insufficient history (< 2 weeks)", () => {
    expect(confidence({ dq: "high", history: [] }).level).toBe("Low");
  });

  it("returns Medium for medium quality + stable demand", () => {
    const history = makeRecords(datesBack(TODAY, 20), 10);
    expect(confidence({ dq: "medium", history }).level).toBe("Medium");
  });

  it("steps down to Low for medium quality + high variability", () => {
    // Spike only on i=0 and i=14 (200 units), zero all other days.
    // This produces week totals like [200, 0, 200, 0, 0] → CV >> 0.5.
    const records: SalesRecord[] = datesBack(TODAY, 28).map((date, i) => ({
      storeId: "T-1",
      skuId: "S-1",
      date,
      unitsSold: i % 14 === 0 ? 200 : 0,
    }));
    expect(confidence({ dq: "medium", history: records }).level).toBe("Low");
  });

  it("always includes a non-empty reason string", () => {
    const history = makeRecords(datesBack(TODAY, 28), 10);
    expect(confidence({ dq: "high", history }).reason.length).toBeGreaterThan(0);
  });
});
