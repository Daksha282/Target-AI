import type { SkuHealth } from "../engine/types";
import { formatUnits, formatDays, formatDemand } from "../lib/format";
import { ForecastChart } from "./ForecastChart";
import { AiRecommendationPanel } from "./AiRecommendationPanel";

interface Props {
  health: SkuHealth;
  onClose: () => void;
}

export function SkuDetail({ health, onClose }: Props) {
  const { sku, inventoryRow } = health;

  return (
    <div className="sku-detail-overlay" onClick={onClose}>
      <div className="sku-detail" onClick={(e) => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose}>✕</button>

        <div className="detail-header">
          <div>
            <h2 className="detail-name">{sku.name}</h2>
            <span className="detail-ids">
              {health.skuId} · {health.storeId} · {sku.category}
            </span>
          </div>
          <span className={`risk-badge risk-${health.riskClass} risk-lg`}>
            {health.riskClass}
          </span>
        </div>

        <div className="detail-metrics">
          <div className="metric-card">
            <span className="metric-label">On Hand</span>
            <span className="metric-value">{formatUnits(inventoryRow.onHand)}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">On Order</span>
            <span className="metric-value">{formatUnits(inventoryRow.onOrder)}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Days of Supply</span>
            <span className="metric-value">{formatDays(health.daysOfSupply)}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Avg Daily Demand</span>
            <span className="metric-value">{formatDemand(health.averageDailyDemand)}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Reorder Point</span>
            <span className="metric-value">{formatUnits(Math.round(health.reorderPoint))}</span>
          </div>
          <div className="metric-card metric-highlight">
            <span className="metric-label">Reorder Qty</span>
            <span className="metric-value">{formatUnits(health.reorderQty)}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Lead Time</span>
            <span className="metric-value">{sku.leadTimeDays} days</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Brand Type</span>
            <span className={`brand-badge brand-${sku.brandType}`}>{sku.brandType}</span>
          </div>
        </div>

        <ForecastChart data={health.forecastData} skuName={sku.name} />

        <AiRecommendationPanel health={health} />
      </div>
    </div>
  );
}
