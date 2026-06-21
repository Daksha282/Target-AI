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
