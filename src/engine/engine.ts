import type { Store, Sku, InventoryRow, SalesRecord, SkuHealth } from "./types";
import { averageDailyDemand, daysOfSupply, reorderPoint as calcSuggestedRP } from "./metrics";
import { fourWeekForecast } from "./forecast";
import { classifyRisk } from "./risk";
import { reorderQuantity } from "./reorder";
import { dataQuality, confidence } from "./confidence";
import { demandTrend, projectionDates } from "./signals";

export function runEngine(
  _stores: Store[],
  skus: Sku[],
  inventory: InventoryRow[],
  salesHistory: SalesRecord[],
  reorderPointOverrides: Record<string, number> = {}
): SkuHealth[] {
  // "Today" = latest date across the entire history, NOT the system clock.
  const today = salesHistory.reduce(
    (max, r) => (r.date > max ? r.date : max),
    salesHistory[0]?.date ?? ""
  );

  const skuMap = new Map(skus.map((s) => [s.skuId, s]));

  return inventory.map((row): SkuHealth => {
    const sku = skuMap.get(row.skuId)!;
    const history = salesHistory.filter(
      (r) => r.skuId === row.skuId && r.storeId === row.storeId
    );

    const add = averageDailyDemand(history, today);

    // Operative RP: category override if set, otherwise the stored inventory value.
    // classifyRisk and reorderQuantity MUST use this — never the computed suggestion.
    const operativeRP =
      reorderPointOverrides[sku.category] !== undefined
        ? reorderPointOverrides[sku.category]
        : row.reorderPoint;

    // Suggested RP: engine formula, for display only.
    const suggestedReorderPoint = calcSuggestedRP(add, sku.leadTimeDays, row.safetyStock);

    const dos = daysOfSupply(row.onHand, add);

    const riskClass = classifyRisk({
      onHand: row.onHand,
      reorderPoint: operativeRP,
      daysOfSupply: dos,
      leadTimeDays: sku.leadTimeDays,
    });

    const reorderQty = reorderQuantity({
      onHand: row.onHand,
      onOrder: row.onOrder,
      reorderPoint: operativeRP,
      add,
    });

    const forecastData = fourWeekForecast(history, today);
    const dq = dataQuality(history, today);
    const conf = confidence({ dq, history });

    const trend = demandTrend(history, today);
    const projection = projectionDates(dos, sku.leadTimeDays, today);

    return {
      skuId: row.skuId,
      storeId: row.storeId,
      sku,
      inventoryRow: row,
      averageDailyDemand: add,
      daysOfSupply: dos,
      reorderPoint: operativeRP,
      suggestedReorderPoint,
      reorderQty,
      forecastData,
      riskClass,
      dataQuality: dq,
      confidence: conf.level,
      confidenceReason: conf.reason,
      demandTrend: trend,
      projection,
    };
  });
}
