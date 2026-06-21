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
}
