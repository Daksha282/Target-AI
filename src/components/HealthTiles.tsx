import type { SkuHealth } from "../engine/types";

interface Props {
  skuHealthList: SkuHealth[];
}

export function HealthTiles({ skuHealthList }: Props) {
  const total = skuHealthList.length;
  const lowStock = skuHealthList.filter((h) => h.riskClass === "low-stock").length;
  const excess = skuHealthList.filter((h) => h.riskClass === "excess").length;
  const healthy = skuHealthList.filter((h) => h.riskClass === "healthy").length;
  const healthScore = total === 0 ? 0 : Math.round((healthy / total) * 100);

  return (
    <div className="status-strip">
      <div className="strip-seg seg-alert">
        <span className="seg-value">{lowStock}</span>
        <span className="seg-label">Low-Stock</span>
      </div>
      <div className="strip-seg seg-warn">
        <span className="seg-value">{excess}</span>
        <span className="seg-label">Excess Stock</span>
      </div>
      <div className="strip-seg seg-ok">
        <span className="seg-value">{healthy}</span>
        <span className="seg-label">Healthy</span>
      </div>
      <div className="strip-seg seg-score">
        <span className="seg-value">
          {healthScore}
          <span className="seg-unit">%</span>
        </span>
        <span className="seg-label">Portfolio Score</span>
      </div>
    </div>
  );
}
