import { useState, useMemo } from "react";
import type { SkuHealth, RiskClass } from "../engine/types";
import { formatUnits, formatDays, formatDemand } from "../lib/format";

interface Props {
  skuHealthList: SkuHealth[];
  onSelectSku: (health: SkuHealth) => void;
}

type SortKey = "name" | "category" | "store" | "onHand" | "daysOfSupply" | "reorderQty" | "risk";

const riskOrder: Record<RiskClass, number> = {
  "low-stock": 0,
  healthy: 1,
  excess: 2,
};

const filterLabels: Record<RiskClass | "all", string> = {
  all: "All",
  "low-stock": "Low-Stock",
  excess: "Excess",
  healthy: "Healthy",
};

export function InventoryTable({ skuHealthList, onSelectSku }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("risk");
  const [sortAsc, setSortAsc] = useState(true);
  const [riskFilter, setRiskFilter] = useState<RiskClass | "all">("all");
  const [searchText, setSearchText] = useState("");

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  const visible = useMemo(() => {
    const term = searchText.toLowerCase();
    return skuHealthList
      .filter((h) => riskFilter === "all" || h.riskClass === riskFilter)
      .filter((h) =>
        term === "" ||
        h.sku.name.toLowerCase().includes(term) ||
        h.sku.category.toLowerCase().includes(term)
      )
      .sort((a, b) => {
        let diff = 0;
        switch (sortKey) {
          case "name":     diff = a.sku.name.localeCompare(b.sku.name); break;
          case "category": diff = a.sku.category.localeCompare(b.sku.category); break;
          case "store":    diff = a.storeId.localeCompare(b.storeId); break;
          case "onHand":   diff = a.inventoryRow.onHand - b.inventoryRow.onHand; break;
          case "daysOfSupply": {
            const av = isFinite(a.daysOfSupply) ? a.daysOfSupply : 9999;
            const bv = isFinite(b.daysOfSupply) ? b.daysOfSupply : 9999;
            diff = av - bv;
            break;
          }
          case "reorderQty": diff = a.reorderQty - b.reorderQty; break;
          default:           diff = riskOrder[a.riskClass] - riskOrder[b.riskClass]; break;
        }
        return sortAsc ? diff : -diff;
      });
  }, [skuHealthList, riskFilter, searchText, sortKey, sortAsc]);

  function col(key: SortKey, label: string, numeric = false) {
    return (
      <th
        className={`sortable${numeric ? " num" : ""}`}
        onClick={() => handleSort(key)}
      >
        {label}{sortKey === key ? (sortAsc ? " ↑" : " ↓") : ""}
      </th>
    );
  }

  return (
    <div className="table-wrapper">
      <div className="table-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search by SKU name or category…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <span className="toolbar-divider" />
        <span className="toolbar-label">Risk:</span>
        {(["all", "low-stock", "excess", "healthy"] as const).map((f) => (
          <button
            key={f}
            className={`filter-btn${riskFilter === f ? " active" : ""}`}
            onClick={() => setRiskFilter(f)}
          >
            {filterLabels[f]}
          </button>
        ))}
        <span className="toolbar-count">{visible.length} rows</span>
      </div>

      <table className="inventory-table">
        <thead>
          <tr>
            {col("name", "SKU")}
            {col("category", "Category")}
            {col("store", "Store")}
            <th>Brand</th>
            {col("onHand", "On Hand", true)}
            <th className="num">On Order</th>
            {col("daysOfSupply", "Days Supply", true)}
            <th className="num">Avg Demand</th>
            {col("reorderQty", "Reorder Qty", true)}
            {col("risk", "Risk")}
          </tr>
        </thead>
        <tbody>
          {visible.map((h) => (
            <tr
              key={`${h.storeId}-${h.skuId}`}
              className={`table-row clickable rail-${h.riskClass}`}
              onClick={() => onSelectSku(h)}
            >
              <td>
                <span className="sku-name">{h.sku.name}</span>
                <span className="sku-id">{h.skuId}</span>
              </td>
              <td>{h.sku.category}</td>
              <td>{h.storeId}</td>
              <td>
                <span className={`brand-badge brand-${h.sku.brandType}`}>
                  {h.sku.brandType}
                </span>
              </td>
              <td className="num">{formatUnits(h.inventoryRow.onHand)}</td>
              <td className="num">{formatUnits(h.inventoryRow.onOrder)}</td>
              <td className="num">{formatDays(h.daysOfSupply)}</td>
              <td className="num">{formatDemand(h.averageDailyDemand)}</td>
              <td className="num">{h.reorderQty > 0 ? <strong className="qty-alert">{formatUnits(h.reorderQty)}</strong> : "—"}</td>
              <td>
                <span className={`risk-badge risk-${h.riskClass}`}>{h.riskClass}</span>
              </td>
            </tr>
          ))}
          {visible.length === 0 && (
            <tr>
              <td colSpan={10} className="empty-row">No rows match your filters.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
