import { useMemo } from "react";
import type { SkuHealth } from "../engine/types";
import { useThresholds } from "../context/ThresholdContext";

interface Props {
  skuHealthList: SkuHealth[];
  categories: string[];
}

export function ThresholdControls({ skuHealthList, categories }: Props) {
  const { thresholds, setThreshold, resetThreshold } = useThresholds();

  // category → unique skuIds (product level, not per-store)
  const categorySkuIds = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const h of skuHealthList) {
      const list = map.get(h.sku.category) ?? [];
      if (!list.includes(h.skuId)) list.push(h.skuId);
      map.set(h.sku.category, list);
    }
    return map;
  }, [skuHealthList]);

  // category → stored reorderPoint range across all stores
  const categoryStoredRange = useMemo(() => {
    const map = new Map<string, { min: number; max: number }>();
    for (const h of skuHealthList) {
      const rp = h.inventoryRow.reorderPoint;
      const ex = map.get(h.sku.category);
      map.set(
        h.sku.category,
        ex ? { min: Math.min(ex.min, rp), max: Math.max(ex.max, rp) } : { min: rp, max: rp }
      );
    }
    return map;
  }, [skuHealthList]);

  return (
    <div className="threshold-controls">
      <h3 className="panel-title">Reorder Thresholds</h3>
      <p className="threshold-hint">Override reorder point by category. Changes apply instantly.</p>
      <div className="threshold-grid">
        {categories.map((cat) => {
          const skuIds = categorySkuIds.get(cat) ?? [];
          const overrideValue = skuIds.length > 0 ? thresholds[skuIds[0]] : undefined;
          const range = categoryStoredRange.get(cat);
          const storedLabel = range
            ? range.min === range.max
              ? String(range.min)
              : `${range.min}–${range.max}`
            : "—";

          return (
            <div key={cat} className="threshold-row">
              <span className="threshold-cat">{cat}</span>
              <span className="threshold-stored">stored: {storedLabel}</span>
              <input
                type="number"
                min={1}
                className={`threshold-input${overrideValue !== undefined ? " threshold-override-active" : ""}`}
                placeholder={storedLabel}
                value={overrideValue !== undefined ? overrideValue : ""}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v > 0) {
                    skuIds.forEach((id) => setThreshold(id, v));
                  } else {
                    skuIds.forEach((id) => resetThreshold(id));
                  }
                }}
              />
              {overrideValue !== undefined && (
                <button
                  className="threshold-reset-btn"
                  onClick={() => skuIds.forEach((id) => resetThreshold(id))}
                >
                  Reset
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
