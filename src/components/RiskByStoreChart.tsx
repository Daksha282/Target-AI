import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { SkuHealth } from "../engine/types";
import { stores } from "../data";

interface Props {
  items: SkuHealth[];
}

// Risk-class colours mirror the rest of the board: red = low-stock signal,
// green = healthy, amber = excess. Recharts needs literal values, not var().
const LOW = "#cc0000";
const HEALTHY = "#16a34a";
const EXCESS = "#f59e0b";
const GRID = "#dde2e8";
const MUTED = "#6a727e";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

interface StoreRow {
  storeId: string;
  store: string;
  "low-stock": number;
  healthy: number;
  excess: number;
}

// Reads ONLY existing SkuHealth fields — counts risk classes per store. No recomputation.
export function RiskByStoreChart({ items }: Props) {
  const nameById = new Map(stores.map((s) => [s.storeId, s.name]));

  const byStore = new Map<string, StoreRow>();
  for (const h of items) {
    let row = byStore.get(h.storeId);
    if (!row) {
      row = {
        storeId: h.storeId,
        store: nameById.get(h.storeId) ?? h.storeId,
        "low-stock": 0,
        healthy: 0,
        excess: 0,
      };
      byStore.set(h.storeId, row);
    }
    row[h.riskClass] += 1;
  }

  const data = [...byStore.values()].sort((a, b) =>
    a.store.localeCompare(b.store)
  );

  return (
    <div className="insight-card">
      <h4 className="chart-title">Risk Distribution by Store</h4>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="store"
            tick={{ fontSize: 11, fontFamily: MONO, fill: MUTED }}
            tickLine={{ stroke: GRID }}
            axisLine={{ stroke: GRID }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fontFamily: MONO, fill: MUTED }}
            width={36}
            tickLine={{ stroke: GRID }}
            axisLine={{ stroke: GRID }}
            label={{ value: "SKUs", angle: -90, position: "insideLeft", fontSize: 10, fill: MUTED, letterSpacing: 1 }}
          />
          <Tooltip cursor={{ fill: "rgba(20, 23, 28, 0.04)" }} />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'Archivo', sans-serif", paddingTop: 6 }} />
          <Bar dataKey="low-stock" stackId="risk" fill={LOW} name="Low-stock" />
          <Bar dataKey="healthy" stackId="risk" fill={HEALTHY} name="Healthy" />
          <Bar dataKey="excess" stackId="risk" fill={EXCESS} name="Excess" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
