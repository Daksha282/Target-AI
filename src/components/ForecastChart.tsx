import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { SkuHealth } from "../engine/types";

interface Props {
  health: SkuHealth;
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
        <h4 className="chart-title">Weekly Demand Forecast</h4>
        <div className="forecast-empty">Insufficient data for forecast</div>
      </div>
    );
  }

  return (
    <div className="chart-wrapper">
      <h4 className="chart-title">Weekly Demand Forecast</h4>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="weekLabel"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: string) => v.replace(/^\d{4}-/, "")}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            width={48}
            label={{ value: "units", angle: -90, position: "insideLeft", fontSize: 11, fill: "#718096" }}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              `${value} units`,
              name === "actual" ? "Actual" : "Projected",
            ]}
          />
          <Legend
            formatter={(value: string) =>
              value === "actual" ? "Actual (weekly)" : "Projected (4-wk avg)"
            }
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="projected"
            stroke="#f59e0b"
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
