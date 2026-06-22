import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { SkuHealth, RiskClass } from "../engine/types";
import { stores } from "../data";

interface Props {
  items: SkuHealth[];
}

// Risk-class colours mirror the rest of the board. Recharts needs literal values.
const RISK_COLOR: Record<RiskClass, string> = {
  "low-stock": "#cc0000",
  healthy: "#16a34a",
  excess: "#f59e0b",
};
const GRID = "#dde2e8";
const MUTED = "#6a727e";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

interface Point {
  leadTimeDays: number;
  daysOfSupply: number;
  riskClass: RiskClass;
  name: string;
  store: string;
}

interface TipProps {
  active?: boolean;
  payload?: { payload: Point }[];
}

function ScatterTip({ active, payload }: TipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="chart-tip">
      <div className="chart-tip-week">
        {p.name} · {p.store}
      </div>
      <div className="chart-tip-row">
        <span className="chart-tip-name">Lead time</span>
        <span className="chart-tip-val">{p.leadTimeDays}d</span>
      </div>
      <div className="chart-tip-row">
        <span className="chart-tip-name">Days of supply</span>
        <span className="chart-tip-val">{Math.round(p.daysOfSupply)}d</span>
      </div>
      <div className="chart-tip-row">
        <span className="chart-tip-name">Risk</span>
        <span className="chart-tip-val">{p.riskClass}</span>
      </div>
    </div>
  );
}

// Reads ONLY existing SkuHealth fields. Skips non-finite days-of-supply (no demand).
export function SupplyVsLeadChart({ items }: Props) {
  const nameById = new Map(stores.map((s) => [s.storeId, s.name]));

  const data: Point[] = items
    .filter((h) => Number.isFinite(h.daysOfSupply))
    .map((h) => ({
      leadTimeDays: h.sku.leadTimeDays,
      daysOfSupply: h.daysOfSupply,
      riskClass: h.riskClass,
      name: h.sku.name,
      store: nameById.get(h.storeId) ?? h.storeId,
    }));

  // Anchor the y = x diagonal across the visible range so it always spans the plot.
  const maxAxis = data.reduce(
    (m, p) => Math.max(m, p.leadTimeDays, p.daysOfSupply),
    0
  );

  return (
    <div className="insight-card">
      <h4 className="chart-title">Days of Supply vs Lead Time</h4>
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 10, right: 16, left: 4, bottom: 18 }}>
          <CartesianGrid stroke={GRID} />
          <XAxis
            type="number"
            dataKey="leadTimeDays"
            name="Lead time"
            tick={{ fontSize: 11, fontFamily: MONO, fill: MUTED }}
            tickLine={{ stroke: GRID }}
            axisLine={{ stroke: GRID }}
            label={{ value: "Lead time (days)", position: "insideBottom", offset: -10, fontSize: 11, fill: MUTED }}
          />
          <YAxis
            type="number"
            dataKey="daysOfSupply"
            name="Days of supply"
            tick={{ fontSize: 11, fontFamily: MONO, fill: MUTED }}
            width={44}
            tickLine={{ stroke: GRID }}
            axisLine={{ stroke: GRID }}
            label={{ value: "Days of supply", angle: -90, position: "insideLeft", fontSize: 11, fill: MUTED }}
          />
          <ZAxis range={[60, 60]} />
          <ReferenceLine
            segment={[
              { x: 0, y: 0 },
              { x: maxAxis, y: maxAxis },
            ]}
            stroke={MUTED}
            strokeDasharray="5 4"
            label={{ value: "DoS = Lead Time", position: "insideTopRight", fontSize: 10, fill: MUTED }}
            ifOverflow="extendDomain"
          />
          <Tooltip content={<ScatterTip />} cursor={{ strokeDasharray: "3 3", stroke: MUTED }} />
          <Scatter data={data}>
            {data.map((p, i) => (
              <Cell key={i} fill={RISK_COLOR[p.riskClass]} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <p className="insight-caption">
        Points below the diagonal cannot be reordered before stockout.
      </p>
    </div>
  );
}
