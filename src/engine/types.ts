// Core data shapes. The engine build step (BUILD_PLAN prompt P3) ADDS to this
// file (SkuHealth, forecast types, etc.) — it must not overwrite these.

export type BrandType = "national" | "owned";
export type Role = "analyst" | "planner" | "executive";
export type Confidence = "High" | "Medium" | "Low";
export type RiskClass = "low-stock" | "healthy" | "excess";

export interface Store {
  storeId: string;
  name: string;
  region: string;
}

export interface Sku {
  skuId: string;
  name: string;
  category: string;
  brandType: BrandType;
  leadTimeDays: number;
}

export interface InventoryRow {
  storeId: string;
  skuId: string;
  onHand: number;
  onOrder: number;
  reorderPoint: number; // operative, user-adjustable threshold used by risk classification
  safetyStock: number;
}

export interface SalesRecord {
  storeId: string;
  skuId: string;
  date: string; // ISO YYYY-MM-DD
  unitsSold: number;
}

export interface ForecastPoint {
  weekLabel: string;
  actual?: number;
  projected?: number;
}

export type DataQuality = "high" | "medium" | "low";

export interface DemandTrend {
  direction: "rising" | "falling" | "flat";
  /** Fractional week-over-week change (e.g. 0.12 = +12%). UI multiplies by 100. */
  weeklyPctChange: number;
}

export interface Projection {
  /** ISO YYYY-MM-DD the SKU is projected to hit zero on-hand, or null if no demand. */
  projectedStockoutDate: string | null;
  /** ISO YYYY-MM-DD by which an order must be placed to avoid a stockout, or null. */
  orderByDate: string | null;
  /** True when the order-by date is today or already past. */
  overdue: boolean;
}

export interface SkuHealth {
  skuId: string;
  storeId: string;
  sku: Sku;
  inventoryRow: InventoryRow;
  averageDailyDemand: number;
  daysOfSupply: number;
  /** Operative threshold — equals inventoryRow.reorderPoint (or category override). Used by classifyRisk. */
  reorderPoint: number;
  /** Engine-computed suggestion: add × leadTimeDays + safetyStock. For display only; never used for risk classification. */
  suggestedReorderPoint: number;
  reorderQty: number;
  forecastData: ForecastPoint[];
  riskClass: RiskClass;
  dataQuality: DataQuality;
  confidence: Confidence;
  confidenceReason: string;
  demandTrend: DemandTrend;
  projection: Projection;
}
