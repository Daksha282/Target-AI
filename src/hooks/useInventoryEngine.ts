import { useMemo } from "react";
import { stores, skus, inventory, salesHistory } from "../data";
import type { Store, Sku, SkuHealth } from "../engine/types";
import { runEngine } from "../engine/engine";
import { useThresholds } from "../context/ThresholdContext";

export function useInventoryEngine(): {
  skuHealthList: SkuHealth[];
  stores: Store[];
  skus: Sku[];
} {
  const { thresholds } = useThresholds();

  const skuHealthList = useMemo(() => {
    // ThresholdControls sets the same value for every skuId in a category, so
    // translating per-skuId → per-category overrides is always lossless here.
    // This keeps the engine's existing category-override API unchanged.
    const skuToCategory = new Map(skus.map((s) => [s.skuId, s.category]));
    const categoryOverrides: Record<string, number> = {};
    for (const [skuId, value] of Object.entries(thresholds)) {
      const cat = skuToCategory.get(skuId);
      if (cat !== undefined) categoryOverrides[cat] = value;
    }
    return runEngine(stores, skus, inventory, salesHistory, categoryOverrides);
  }, [thresholds]);

  return { skuHealthList, stores, skus };
}
