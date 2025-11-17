"use client";

import { useEffect, useState } from "react";
import { getHistoricalPrice } from "@/lib/stocks";
import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Bar,
  Legend,
  ComposedChart,
  CartesianGrid,
  ReferenceLine,
  Brush,
} from "recharts";
import { formatNumber } from "@/utils/formatters";
import {
  BB_PERIOD,
  bollingerBands,
  rsi,
  RSI_PERIOD,
} from "@/utils/marketIndicators";
import { ZoomAndPan } from "./ZoomAndPan";

// Define the chart height and calculate the stacking dimensions
const CHART_HEIGHT = 400; // Increased overall height to accommodate RSI
const PRICE_HEIGHT = CHART_HEIGHT * 0.6; // 60% for Price/BB
const RSI_HEIGHT = CHART_HEIGHT * 0.05; // 25% for RSI
const VOLUME_HEIGHT = CHART_HEIGHT * 0.15; // 15% for Volume

const GAP = 5; // Margin between stacked charts
const RSI_Y_OFFSET = PRICE_HEIGHT + GAP; // Starts below Price chart
const VOLUME_Y_OFFSET = RSI_Y_OFFSET + RSI_HEIGHT + GAP; // Starts below RSI chart

export default function StockChart({ stock }: { stock: any }) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const price = await getHistoricalPrice(stock.symbol);
      const bb = bollingerBands(
        price.map((d) => d.price ?? 0),
        BB_PERIOD
      );
      const rsiValue = rsi(
        price.map((d) => d.price ?? 0),
        RSI_PERIOD
      );

      console.log("Price", price);
      console.log("BB:", bb);
      console.log("RSI:", rsiValue);

      if (cancelled) return;

      const merged = price.map((p, idx) => ({
        date: p.date,
        price: p.price,
        volume: p.volume,
        bb_upper: bb.upper[idx] ?? null,
        bb_middle: bb.middle[idx] ?? null,
        bb_lower: bb.lower[idx] ?? null,
        rsi: rsiValue[idx] ?? null,
      }));

      setData(merged);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [stock]);

  if (!data.length) return null;

  return (
    <div className="rounded-lg border p-4 bg-white shadow-sm font-sans">
      <h2 className="text-lg font-bold mb-4 text-gray-800">
        Historical Price, Volume, and Indicators
      </h2>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
        >
          {/* Add grid lines for clarity on the main chart area */}
          <CartesianGrid stroke="#f0f0f0" vertical={false} />

          {/* X-Axis for Dates: Shared across all three charts */}
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} />

          {/* Tooltip: Shows data for all elements hovered */}
          <Tooltip
            formatter={(value, name) => [formatNumber(Number(value)), name]}
          />

          {/* Legend: Displays names of all lines and bars */}
          <Legend
            align="right"
            verticalAlign="top"
            wrapperStyle={{ paddingBottom: "10px" }}
          />

          {/* 1. Primary Y-Axis for Price and Bollinger Bands (Top 60%) */}
          <YAxis
            yAxisId="price"
            orientation="left"
            stroke="#2563eb"
            height={PRICE_HEIGHT} // 60% height
            y={0} // Start from the top
            domain={[0, "auto"]}
            tickFormatter={(value) => value.toFixed(2)}
            width={70}
            label={{
              value: "Price",
              angle: -90,
              position: "insideLeft",
              offset: -5,
              fill: "#2563eb",
            }}
          />

          {/* 2. Secondary Y-Axis for RSI (Middle 25%) */}
          <YAxis
            yAxisId="rsi"
            orientation="right"
            stroke="#10b981"
            height={RSI_HEIGHT} // 25% height
            y={RSI_Y_OFFSET} // Starts below Price chart
            domain={[0, 100]} // RSI is always 0 to 100
            tickFormatter={(value) => value.toFixed(0)}
            style={{ fontSize: 10 }}
            width={70}
            label={{
              value: `RSI (${RSI_PERIOD})`,
              angle: 90,
              position: "insideRight",
              offset: -5,
              fill: "#10b981",
            }}
          />

          {/* 3. Tertiary Y-Axis for Volume (Bottom 15%) */}
          <YAxis
            yAxisId="volume"
            orientation="right"
            stroke="#f97316"
            height={VOLUME_HEIGHT} // 15% height
            y={VOLUME_Y_OFFSET} // Starts below RSI chart
            domain={[0, "dataMax"]}
            tickFormatter={(value) => formatNumber(value)}
            style={{ fontSize: 10 }}
            width={70}
            label={{
              value: "Volume",
              angle: -90,
              position: "insideLeft",
              offset: -5,
              fill: "#f97316",
            }}
          />

          {/* Price Line (Main element) */}
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="price"
            name="Closing Price"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
          />

          {/* Bollinger Bands (BB) - Overlay on Price Chart */}
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="bb_upper"
            name={`BB Upper (${BB_PERIOD})`}
            stroke="#94a3b8"
            strokeWidth={1}
            dot={false}
            strokeDasharray="3 3"
          />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="bb_middle"
            name={`BB Middle (${BB_PERIOD} SMA)`}
            stroke="#475569"
            strokeWidth={1}
            dot={false}
          />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="bb_lower"
            name={`BB Lower (${BB_PERIOD})`}
            stroke="#94a3b8"
            strokeWidth={1}
            dot={false}
            strokeDasharray="3 3"
          />

          {/* RSI Indicator (RSI Chart Area) */}
          <Line
            yAxisId="rsi"
            type="monotone"
            dataKey="rsi"
            name={`RSI (${RSI_PERIOD})`}
            stroke="#10b981"
            strokeWidth={1.5}
            dot={false}
          />

          {/* RSI Overbought/Oversold Reference Lines */}
          <ReferenceLine
            yAxisId="rsi"
            y={70}
            stroke="#ef4444"
            strokeDasharray="3 3"
            label={{
              value: "Overbought (70)",
              position: "right",
              fill: "#ef4444",
              fontSize: 10,
            }}
          />
          <ReferenceLine
            yAxisId="rsi"
            y={30}
            stroke="#22c55e"
            strokeDasharray="3 3"
            label={{
              value: "Oversold (30)",
              position: "right",
              fill: "#22c55e",
              fontSize: 10,
            }}
          />
          <ReferenceLine
            yAxisId="rsi"
            y={50}
            stroke="#9ca3af"
            strokeDasharray="3 3"
          />

          {/* Bar for Volume (Bottom 15%) */}
          <Bar
            yAxisId="volume"
            dataKey="volume"
            name="Volume"
            fill="#f97316"
            opacity={0.6}
            maxBarSize={5}
          />

          {/* Brush for zooming */}
          <Brush
            dataKey="date"
            height={16}
            stroke="#010a1fff"
            travellerWidth={10}
          />
          <ZoomAndPan />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
