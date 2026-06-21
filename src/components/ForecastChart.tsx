import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { SkuHealth } from "../engine/types";

interface Props {
  health: SkuHealth;
}

// Palette mirrors the CSS design tokens (Recharts needs literal values, not var()).
// Ink for measured history (the authoritative data); teal for the forward estimate.
// Red is reserved for risk/action elsewhere, so it is deliberately absent here.
const INK = "#14171c";
const STEEL = "#1f6e78";
const GRID = "#dde2e8";
const MUTED = "#6a727e";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

interface TipPayloadItem {
  dataKey?: string | number;
  value?: number;
  color?: string;
}
interface TipProps {
  active?: boolean;
  label?: string | number;
  payload?: TipPayloadItem[];
}

function ChartTip({ active, payload, label }: TipProps) {
  const rows = (payload ?? []).filter((p) => p.value != null);
  if (!active || rows.length === 0) return null;
  return (
    <div className="chart-tip">
      <div className="chart-tip-week">{label}</div>
      {rows.map((p) => (
        <div key={String(p.dataKey)} className="chart-tip-row">
          <span className="chart-tip-dot" style={{ background: p.color }} />
          <span className="chart-tip-name">{p.dataKey === "actual" ? "Actual" : "Projected"}</span>
          <span className="chart-tip-val">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// Reads ONLY health.forecastData (computed by the Layer 1 engine). No recomputation.
export function ForecastChart({ health }: Props) {
  const data = health.forecastData;

  const hasSignal =
    data.length > 0 &&
    data.some((p) => (p.actual ?? 0) > 0 || (p.projected ?? 0) > 0);

  if (!hasSignal) {
    return (
      <div className="chart-wrapper">
        <h4 className="chart-title">Weekly Demand · Actual → Forecast</h4>
        <div className="forecast-empty">Insufficient data for forecast</div>
      </div>
    );
  }

  // Where measured history ends and the 4-week projection begins.
  const boundary = data.find((p) => p.projected != null && p.actual == null)?.weekLabel;

  return (
    <div className="chart-wrapper">
      <h4 className="chart-title">Weekly Demand · Actual → Forecast</h4>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="weekLabel"
            tick={{ fontSize: 11, fontFamily: MONO, fill: MUTED }}
            tickFormatter={(v: string) => v.replace(/^\d{4}-/, "")}
            tickLine={{ stroke: GRID }}
            axisLine={{ stroke: GRID }}
          />
          <YAxis
            tick={{ fontSize: 11, fontFamily: MONO, fill: MUTED }}
            width={48}
            tickLine={{ stroke: GRID }}
            axisLine={{ stroke: GRID }}
            label={{ value: "UNITS", angle: -90, position: "insideLeft", fontSize: 10, fill: MUTED, letterSpacing: 1 }}
          />
          <Tooltip content={<ChartTip />} cursor={{ stroke: MUTED, strokeWidth: 1, strokeDasharray: "3 3" }} />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: "'Archivo', sans-serif", paddingTop: 6 }}
            formatter={(value: string) =>
              value === "actual" ? "Actual (weekly)" : "Projected (4-wk avg)"
            }
          />
          {boundary && (
            <ReferenceLine
              x={boundary}
              stroke={MUTED}
              strokeDasharray="3 3"
              label={{ value: "forecast", position: "insideTopRight", fontSize: 10, fill: MUTED }}
            />
          )}
          <Line
            type="monotone"
            dataKey="actual"
            stroke={INK}
            strokeWidth={2}
            dot={{ r: 2.5, fill: INK, strokeWidth: 0 }}
            activeDot={{ r: 4 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="projected"
            stroke={STEEL}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
