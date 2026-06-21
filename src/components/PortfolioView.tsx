import { useState, useMemo } from "react";
import type { SkuHealth } from "../engine/types";
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

  return (
    <div className="portfolio">
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-logo">🎯</span>
          <span className="app-title">AI Inventory Intelligence Dashboard</span>
        </div>
        <div className="header-right">
          <span className="simulated-label">⚠ SIMULATED DATA</span>
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
        {/* Row 1: portfolio health tiles */}
        <HealthTiles skuHealthList={filteredItems} />

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
