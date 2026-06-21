import { describe, it, expect } from "vitest";
import { fourWeekForecast } from "../forecast";
import type { SalesRecord } from "../types";

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

describe("fourWeekForecast", () => {
  it("returns empty array for empty history", () => {
    expect(fourWeekForecast([])).toEqual([]);
  });

  it("projects flat moving average from last 4 weeks", () => {
    const history = [
      ...recordsForWeek(2026, 10, 10), // 70
      ...recordsForWeek(2026, 11, 20), // 140
      ...recordsForWeek(2026, 12, 30), // 210
      ...recordsForWeek(2026, 13, 40), // 280
    ];
    const result = fourWeekForecast(history);
    const projected = result.filter((p) => p.projected !== undefined);
    expect(projected).toHaveLength(4);
    // avg of [70,140,210,280] = 175
    projected.forEach((p) => expect(p.projected).toBe(175));
  });

  it("includes actuals in output", () => {
    const history = [
      ...recordsForWeek(2026, 10, 10),
      ...recordsForWeek(2026, 11, 10),
    ];
    const result = fourWeekForecast(history);
    const actuals = result.filter((p) => p.actual !== undefined);
    expect(actuals.length).toBeGreaterThan(0);
  });

  it("handles weeks with zero sales (gap)", () => {
    const history = [
      ...recordsForWeek(2026, 10, 50),
      ...recordsForWeek(2026, 11, 0),
      ...recordsForWeek(2026, 12, 0),
      ...recordsForWeek(2026, 13, 50),
    ];
    const result = fourWeekForecast(history);
    const projected = result.filter((p) => p.projected !== undefined);
    // avg = (350 + 0 + 0 + 350) / 4 = 175
    projected.forEach((p) => expect(p.projected).toBe(175));
  });

  it("returns 4 projected points regardless of history depth", () => {
    const history = recordsForWeek(2026, 5, 30);
    const result = fourWeekForecast(history);
    expect(result.filter((p) => p.projected !== undefined)).toHaveLength(4);
  });
});
