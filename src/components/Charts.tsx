"use client";

import {
  formatLabel,
  formatNumber,
  formatPercentage,
} from "@/utils/formatters";
import {
  LineChart as RLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart as RPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

export function LineChart({
  data,
  xKey,
  yKeys,
}: {
  data: any[];
  xKey: string;
  yKeys: string | string[];
}) {
  // Convert single yKey to array for consistent handling
  const yKeysArray = Array.isArray(yKeys) ? yKeys : [yKeys];
  const firstNonZeroIdx = data.findIndex((h) => h.netWorth !== 0);
  let interpolatedSteps: number = 0;
  const interpolatedAndCleanedData = data
    .reduce((acc: typeof data, curr, i, arr) => {
      if (curr.netWorth !== 0) {
        acc.push(curr);
        return acc;
      }

      if (i < firstNonZeroIdx) {
        return acc;
      }

      const prevValue = acc[acc.length - 1].netWorth;
      const nextNonZeroIdx = arr.slice(i).findIndex((h) => h.netWorth !== 0);
      const nextValue =
        nextNonZeroIdx !== -1 ? arr[i + nextNonZeroIdx].netWorth : prevValue;

      const step = (nextValue - prevValue) / (nextNonZeroIdx + 1);
      const interpolatedValue = prevValue + step;
      interpolatedSteps += 1;

      acc.push({ ...curr, netWorth: interpolatedValue });
      return acc;
    }, [])
    .filter(
      (h, i, arr) =>
        (i === 0 && h.netWorth !== 0) ||
        (i === arr.length - 1 && h.netWorth !== 0) ||
        (i > 0 && i < arr.length - 1)
    );
  if (interpolatedSteps > 0 && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("toast", {
        detail: "Interpolated " + interpolatedSteps + " data points.",
      })
    );
  }
  return (
    <div className="w-full h-72">
      <ResponsiveContainer>
        <RLineChart
          data={interpolatedAndCleanedData}
          margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis tickFormatter={formatNumber} />
          <Tooltip
            formatter={(value: number) => [formatNumber(value), "SEK"]}
            labelFormatter={(name: string) => [formatLabel(name)]}
          />
          <Legend formatter={(name: string) => [formatLabel(name)]} />
          {yKeysArray.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </RLineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PieChart({
  data,
  nameKey,
  valueKey,
}: {
  data: any[];
  nameKey: string;
  valueKey: string;
}) {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer>
        <RPieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            outerRadius={100}
          >
            {data.map((_: any, index: number) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [value.toFixed(1) + "%"]}
            labelFormatter={(name: string) => [formatLabel(name)]}
          />
          <Legend formatter={(name: string) => [formatLabel(name)]} />
        </RPieChart>
      </ResponsiveContainer>
    </div>
  );
}
