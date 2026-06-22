import { describe, it, expect } from "vitest";
import { demandTrend, projectionDates } from "../signals";
import type { SalesRecord } from "../types";

// 2026-06-21 is a Sunday, so a week's worth of days ending on it is exactly one
// complete ISO week. weekDailyUnits is ordered oldest → newest; the last entry is
// the week ending at `anchorSunday`.
function weeklySales(weekDailyUnits: number[], anchorSunday: string): SalesRecord[] {
  const records: SalesRecord[] = [];
  const n = weekDailyUnits.length;
  for (let w = 0; w < n; w++) {
    const weeksBack = n - 1 - w;
    for (let day = 0; day < 7; day++) {
      const d = new Date(anchorSunday);
      d.setUTCDate(d.getUTCDate() - weeksBack * 7 - day);
      records.push({
        storeId: "T-1",
        skuId: "S",
        date: d.toISOString().slice(0, 10),
        unitsSold: weekDailyUnits[w],
      });
    }
  }
  return records;
}

const SUNDAY = "2026-06-21";

describe("demandTrend", () => {
  it("rising: recent 3-week mean exceeds prior by > 5%", () => {
    // prior weeks 70/wk, recent weeks 91/wk → pct = 21/70 = 0.3
    const history = weeklySales([10, 10, 10, 13, 13, 13], SUNDAY);
    expect(demandTrend(history, SUNDAY)).toEqual({
      direction: "rising",
      weeklyPctChange: 0.3,
    });
  });

  it("falling: recent 3-week mean below prior by > 5%", () => {
    // prior 70/wk, recent 49/wk → pct = -21/70 = -0.3
    const history = weeklySales([10, 10, 10, 7, 7, 7], SUNDAY);
    expect(demandTrend(history, SUNDAY)).toEqual({
      direction: "falling",
      weeklyPctChange: -0.3,
    });
  });

  it("flat: change within ±5%", () => {
    const history = weeklySales([10, 10, 10, 10, 10, 10], SUNDAY);
    expect(demandTrend(history, SUNDAY)).toEqual({
      direction: "flat",
      weeklyPctChange: 0,
    });
  });

  it("flat fallback when fewer than 6 complete weeks", () => {
    const history = weeklySales([10, 10, 10, 20, 20], SUNDAY); // only 5 weeks
    expect(demandTrend(history, SUNDAY)).toEqual({
      direction: "flat",
      weeklyPctChange: 0,
    });
  });

  it("flat fallback when prior 3-week mean is 0", () => {
    const history = weeklySales([0, 0, 0, 10, 10, 10], SUNDAY);
    expect(demandTrend(history, SUNDAY)).toEqual({
      direction: "flat",
      weeklyPctChange: 0,
    });
  });

  it("ignores the in-progress current week (counts only complete weeks)", () => {
    // 6 flat complete weeks + a huge partial spike in the current (Wed) week.
    // The spike must NOT flip the trend to rising.
    const complete = weeklySales([10, 10, 10, 10, 10, 10], SUNDAY);
    const spike: SalesRecord[] = ["2026-06-22", "2026-06-23", "2026-06-24"].map((date) => ({
      storeId: "T-1",
      skuId: "S",
      date,
      unitsSold: 1000,
    }));
    expect(demandTrend([...complete, ...spike], "2026-06-24")).toEqual({
      direction: "flat",
      weeklyPctChange: 0,
    });
  });
});

describe("projectionDates", () => {
  it("finite daysOfSupply: floors stockout and order-by offsets", () => {
    // dos 10.5, lead 3 → stockout +10 days, orderBy +floor(7.5)=+7 days
    expect(projectionDates(10.5, 3, SUNDAY)).toEqual({
      projectedStockoutDate: "2026-07-01",
      orderByDate: "2026-06-28",
      overdue: false,
    });
  });

  it("non-finite daysOfSupply: all null, not overdue", () => {
    expect(projectionDates(Infinity, 7, SUNDAY)).toEqual({
      projectedStockoutDate: null,
      orderByDate: null,
      overdue: false,
    });
  });

  it("overdue boundary: daysOfSupply equals leadTime → overdue, orderBy is today", () => {
    expect(projectionDates(5, 5, SUNDAY)).toEqual({
      projectedStockoutDate: "2026-06-26",
      orderByDate: "2026-06-21",
      overdue: true,
    });
  });

  it("clearly overdue: leadTime exceeds daysOfSupply → orderBy in the past", () => {
    // dos 2, lead 7 → orderBy +floor(-5) = today − 5 days
    expect(projectionDates(2, 7, SUNDAY)).toEqual({
      projectedStockoutDate: "2026-06-23",
      orderByDate: "2026-06-16",
      overdue: true,
    });
  });
});
