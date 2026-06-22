import { describe, it, expect } from "vitest";
import { fourWeekForecast } from "../forecast";
import type { SalesRecord, ForecastPoint } from "../types";

function recordsForWeek(
  year: number,
  week: number,
  units: number
): SalesRecord[] {
  // Generate 7 records for Mon–Sun of the given ISO week
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1) + (week - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return {
      storeId: "T-1",
      skuId: "S-1",
      date: d.toISOString().slice(0, 10),
      unitsSold: units,
    };
  });
}

// Far enough in the future that every generated full week counts as "complete".
const FUTURE = "2027-01-01";

function projectedOf(result: ForecastPoint[]): number[] {
  return result.filter((p) => p.projected !== undefined).map((p) => p.projected!);
}

describe("fourWeekForecast (Holt linear trend)", () => {
  it("returns empty array for empty history", () => {
    expect(fourWeekForecast([], FUTURE)).toEqual([]);
  });

  it("projects an upward slope for a rising series", () => {
    const history = [
      ...recordsForWeek(2026, 10, 10), // 70
      ...recordsForWeek(2026, 11, 20), // 140
      ...recordsForWeek(2026, 12, 30), // 210
      ...recordsForWeek(2026, 13, 40), // 280
    ];
    const projected = projectedOf(fourWeekForecast(history, FUTURE));
    expect(projected).toHaveLength(4);
    // strictly increasing
    for (let i = 1; i < projected.length; i++) {
      expect(projected[i]).toBeGreaterThan(projected[i - 1]);
    }
    expect(projected[3]).toBeGreaterThan(projected[0]);
  });

  it("projects a downward slope for a falling series", () => {
    const history = [
      ...recordsForWeek(2026, 10, 40), // 280
      ...recordsForWeek(2026, 11, 38), // 266
      ...recordsForWeek(2026, 12, 36), // 252
      ...recordsForWeek(2026, 13, 34), // 238
    ];
    const projected = projectedOf(fourWeekForecast(history, FUTURE));
    expect(projected).toHaveLength(4);
    // strictly decreasing and still positive (gentle slope, no clamp)
    for (let i = 1; i < projected.length; i++) {
      expect(projected[i]).toBeLessThan(projected[i - 1]);
    }
    expect(projected[3]).toBeGreaterThan(0);
  });

  it("stays ~flat for a flat series", () => {
    const history = [
      ...recordsForWeek(2026, 10, 20), // 140
      ...recordsForWeek(2026, 11, 20),
      ...recordsForWeek(2026, 12, 20),
      ...recordsForWeek(2026, 13, 20),
    ];
    const projected = projectedOf(fourWeekForecast(history, FUTURE));
    expect(Math.abs(projected[3] - projected[0])).toBeLessThanOrEqual(1);
    projected.forEach((p) => expect(p).toBe(140));
  });

  it("never projects negative units (clamps a steep faller at 0)", () => {
    const history = [
      ...recordsForWeek(2026, 10, 40), // 280
      ...recordsForWeek(2026, 11, 20), // 140
      ...recordsForWeek(2026, 12, 2), //  14
    ];
    const projected = projectedOf(fourWeekForecast(history, FUTURE));
    expect(projected).toHaveLength(4);
    projected.forEach((p) => expect(p).toBeGreaterThanOrEqual(0));
  });

  it("excludes the partial trailing week from training (still slopes up)", () => {
    const complete = [
      ...recordsForWeek(2026, 10, 10), // 70
      ...recordsForWeek(2026, 11, 20), // 140
      ...recordsForWeek(2026, 12, 30), // 210
      ...recordsForWeek(2026, 13, 40), // 280
    ];
    // A single low day in week 14 — if counted, it would drag the trend down.
    const partialDay = recordsForWeek(2026, 14, 1)[0];
    const history = [...complete, partialDay];
    // `today` = that partial day, so week 14 is incomplete (isoWeekEnd > today).
    const result = fourWeekForecast(history, partialDay.date);

    // The partial week still appears as an actual.
    expect(result.some((p) => p.actual !== undefined && p.weekLabel === "2026-W14")).toBe(true);
    // But the projection ignores it and keeps sloping up.
    const projected = projectedOf(result);
    expect(projected[3]).toBeGreaterThan(projected[0]);
  });

  it("includes actuals in output", () => {
    const history = [
      ...recordsForWeek(2026, 10, 10),
      ...recordsForWeek(2026, 11, 10),
    ];
    const actuals = fourWeekForecast(history, FUTURE).filter((p) => p.actual !== undefined);
    expect(actuals.length).toBeGreaterThan(0);
  });

  it("falls back to a flat average when fewer than 3 weeks of data", () => {
    const history = [
      ...recordsForWeek(2026, 10, 10), // 70
      ...recordsForWeek(2026, 11, 30), // 210
    ];
    const projected = projectedOf(fourWeekForecast(history, FUTURE));
    expect(projected).toHaveLength(4);
    // avg of [70, 210] = 140, projected flat
    projected.forEach((p) => expect(p).toBe(140));
  });

  it("returns 4 projected points regardless of history depth", () => {
    const history = recordsForWeek(2026, 5, 30);
    const result = fourWeekForecast(history, FUTURE);
    expect(projectedOf(result)).toHaveLength(4);
  });
});
