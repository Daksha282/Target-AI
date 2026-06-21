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
    <div className="health-tiles">
      <div className="tile tile-alert">
        <span className="tile-value">{lowStock}</span>
        <span className="tile-label">At Risk</span>
      </div>
      <div className="tile tile-warn">
        <span className="tile-value">{excess}</span>
        <span className="tile-label">Excess Stock</span>
      </div>
      <div className="tile tile-ok">
        <span className="tile-value">{healthy}</span>
        <span className="tile-label">Healthy</span>
      </div>
      <div className={`tile ${healthScore >= 70 ? "tile-ok" : healthScore >= 40 ? "tile-warn" : "tile-alert"}`}>
        <span className="tile-value">{healthScore}%</span>
        <span className="tile-label">Health Score</span>
      </div>
    </div>
  );
}
