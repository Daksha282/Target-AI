import type { ReactNode } from "react";
import type { SkuHealth } from "../engine/types";
import { formatUnits, formatDays, formatDemand } from "../lib/format";
import { ForecastChart } from "./ForecastChart";
import { AiRecommendationPanel } from "./AiRecommendationPanel";

interface Props {
  health: SkuHealth;
  onBack: () => void;
}

export function SkuDetail({ health, onBack }: Props) {
  const { sku, inventoryRow } = health;

  return (
    <div className="modal-backdrop" onClick={onBack}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={`${sku.name} detail`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-topbar">
          <button className="modal-back" onClick={onBack}>← Back</button>
          <button className="modal-close" onClick={onBack} aria-label="Close">✕</button>
        </div>

        <div className="detail-header">
          <div>
            <h2 className="detail-name">{sku.name}</h2>
            <div className="detail-ids">
              {health.skuId} · {health.storeId} · {sku.category}
            </div>
          </div>
          <div className="detail-tags">
            <span className={`risk-badge risk-${health.riskClass} risk-lg`}>
              {health.riskClass}
            </span>
            <span className={`brand-badge brand-${sku.brandType}`}>{sku.brandType}</span>
          </div>
        </div>

        <div className="detail-metrics">
          <Metric label="On Hand" value={formatUnits(inventoryRow.onHand)} />
          <Metric label="On Order" value={formatUnits(inventoryRow.onOrder)} />
          <Metric label="Days of Supply" value={formatDays(health.daysOfSupply)} />
          <Metric label="Avg Daily Demand" value={formatDemand(health.averageDailyDemand)} />
          <Metric label="Reorder Point" value={formatUnits(Math.round(health.reorderPoint))} />
          <Metric
            label="Reorder Qty"
            value={formatUnits(health.reorderQty)}
            highlight={health.reorderQty > 0}
          />
          <Metric label="Lead Time" value={`${sku.leadTimeDays} days`} />
          <Metric
            label="Brand Type"
            value={<span className={`brand-badge brand-${sku.brandType}`}>{sku.brandType}</span>}
          />
        </div>

        <ForecastChart health={health} />

        <AiRecommendationPanel health={health} />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`metric-card${highlight ? " metric-highlight" : ""}`}>
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
    </div>
  );
}
