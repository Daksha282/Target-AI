import type { SkuHealth } from "../engine/types";
import { formatUnits, formatDays } from "../lib/format";

interface Props {
  skuHealthList: SkuHealth[];
}

export function AlertsPanel({ skuHealthList }: Props) {
  const alerts = skuHealthList
    .filter((h) => h.riskClass === "low-stock")
    .sort((a, b) => {
      const av = isFinite(a.daysOfSupply) ? a.daysOfSupply : 9999;
      const bv = isFinite(b.daysOfSupply) ? b.daysOfSupply : 9999;
      return av - bv;
    });

  if (alerts.length === 0) {
    return (
      <div className="alerts-panel">
        <h3 className="panel-title">Reorder Alerts</h3>
        <p className="no-alerts-ok">✓ No active alerts</p>
      </div>
    );
  }

  return (
    <div className="alerts-panel">
      <h3 className="panel-title">Reorder Alerts ({alerts.length})</h3>
      <ul className="alert-list">
        {alerts.map((h) => (
          <li key={`${h.storeId}-${h.skuId}`} className="alert-item">
            <div className="alert-header">
              <span className="alert-name">{h.sku.name}</span>
              <span className="risk-badge risk-low-stock">low-stock</span>
            </div>
            <div className="alert-meta">
              <span className="alert-store">{h.storeId}</span>
              <span className="alert-sep">·</span>
              <span>Lead {h.sku.leadTimeDays}d</span>
            </div>
            <div className="alert-stats">
              <span>On hand: <strong>{formatUnits(h.inventoryRow.onHand)}</strong></span>
              <span>Supply: <strong>{formatDays(h.daysOfSupply)}</strong></span>
              {h.reorderQty > 0 && (
                <span>
                  Reorder: <strong className="qty-alert">{formatUnits(h.reorderQty)}</strong>
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
