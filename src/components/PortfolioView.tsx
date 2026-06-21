import { useState, useMemo } from "react";
import type { SkuHealth } from "../engine/types";
import { DATA_TODAY } from "../data";
import { formatDate } from "../lib/format";
import { useInventoryEngine } from "../hooks/useInventoryEngine";
import { HealthTiles } from "./HealthTiles";
import { InventoryTable } from "./InventoryTable";
import { AlertsPanel } from "./AlertsPanel";
import { ThresholdControls } from "./ThresholdControls";

interface Props {
  onSelectSku: (health: SkuHealth) => void;
}

export function PortfolioView({ onSelectSku }: Props) {
  const { skuHealthList: allItems, stores } = useInventoryEngine();
  const [selectedStore, setSelectedStore] = useState<string>("all");

  const filteredItems = useMemo(
    () =>
      selectedStore === "all"
        ? allItems
        : allItems.filter((h) => h.storeId === selectedStore),
    [allItems, selectedStore]
  );

  const categories = useMemo(
    () => [...new Set(allItems.map((h) => h.sku.category))].sort(),
    [allItems]
  );

  // Surfaces the Layer 1 confidence/data-quality fields at portfolio level (CLO 3).
  // Reads existing SkuHealth fields only — no recomputation. Respects the store filter.
  const trust = useMemo(() => {
    let high = 0;
    let low = 0;
    let flagged = 0;
    for (const h of filteredItems) {
      if (h.confidence === "High") high++;
      else if (h.confidence === "Low") low++;
      if (h.dataQuality === "low" || h.dataQuality === "medium") flagged++;
    }
    return { high, low, flagged };
  }, [filteredItems]);

  return (
    <div className="portfolio">
      <header className="app-header">
        <div className="header-brand">
          <span className="bullseye" aria-hidden="true" />
          <span className="brand-text">
            <span className="app-title">Replenishment Control</span>
            <span className="brand-sub">Target · Inventory Intelligence</span>
          </span>
        </div>
        <div className="header-right">
          <span className="data-asof">Data as of {formatDate(DATA_TODAY)}</span>
          <span className="simulated-label">Simulated data</span>
          <select
            className="store-select"
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
          >
            <option value="all">All Stores</option>
            {stores.map((s) => (
              <option key={s.storeId} value={s.storeId}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="portfolio-main">
        {/* Row 1: portfolio health tiles + data-trust readout */}
        <div className="status-block">
          <HealthTiles skuHealthList={filteredItems} />
          <div className="trust-strip">
            <span className="trust-label">Data trust</span>
            <span className="trust-metric">
              <strong className="trust-high">{trust.high}</strong> high-confidence
            </span>
            <span className="trust-metric">
              <strong className="trust-low">{trust.low}</strong> low-confidence
            </span>
            <span className="trust-metric">
              <strong className="trust-flag">{trust.flagged}</strong> flagged for data quality
            </span>
          </div>
        </div>

        {/* Row 2: threshold controls + alerts side by side */}
        <div className="row2-grid">
          <ThresholdControls skuHealthList={allItems} categories={categories} />
          <AlertsPanel skuHealthList={filteredItems} />
        </div>

        {/* Row 3: full-width inventory table */}
        <InventoryTable skuHealthList={filteredItems} onSelectSku={onSelectSku} />
      </main>
    </div>
  );
}
