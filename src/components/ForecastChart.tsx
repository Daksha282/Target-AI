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
import type { ForecastPoint } from "../engine/types";

interface Props {
  data: ForecastPoint[];
  skuName: string;
}

export function ForecastChart({ data, skuName }: Props) {
  return (
    <div className="chart-wrapper">
      <h4 className="chart-title">Weekly Demand — {skuName}</h4>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="weekLabel"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: string) => v.replace(/^\d{4}-/, "")}
          />
          <YAxis tick={{ fontSize: 11 }} width={40} />
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
            dot={{ r: 3 }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
