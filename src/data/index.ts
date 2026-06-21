import storesJson from "./stores.json";
import skusJson from "./skus.json";
import inventoryJson from "./inventory.json";
import salesHistoryJson from "./salesHistory.json";
import type { Store, Sku, InventoryRow, SalesRecord } from "../engine/types";

export const stores = storesJson as Store[];
export const skus = skusJson as Sku[];
export const inventory = inventoryJson as InventoryRow[];
export const salesHistory = salesHistoryJson as SalesRecord[];

// "Today" for the trailing-window math is the latest date in the data,
// NOT the system clock. The engine must derive it like this:
export const DATA_TODAY = salesHistory.reduce(
  (max, r) => (r.date > max ? r.date : max),
  salesHistory[0]?.date ?? "",
);
