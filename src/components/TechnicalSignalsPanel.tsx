import { LineChart, Line, ResponsiveContainer } from "recharts";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { AssetSignal } from "@/hooks/useTechnicalSignals";

function getRecommendation(rsi: string | null, bb: string | null) {
  if (rsi === "long" && bb === "long") return "strong_long";
  if (rsi === "short" && bb === "short") return "strong_short";
  if (rsi === "long" || bb === "long") return "long";
  if (rsi === "short" || bb === "short") return "short";
  return "neutral";
}

function getRecommendationLabel(rec: string) {
  switch (rec) {
    case "strong_long":
      return "Strong Long";
    case "long":
      return "Long";
    case "strong_short":
      return "Strong Short";
    case "short":
      return "Short";
    default:
      return "Neutral";
  }
}

function getRecommendationColor(rec: string) {
  switch (rec) {
    case "strong_long":
      return "bg-green-600 text-white";
    case "long":
      return "bg-green-400 text-white";
    case "strong_short":
      return "bg-red-600 text-white";
    case "short":
      return "bg-red-400 text-white";
    default:
      return "bg-gray-300 text-gray-700";
  }
}

function getArrow(rec: string) {
  switch (rec) {
    case "long":
    case "strong_long":
      return <ArrowUp size={14} className="inline-block" />;
    case "short":
    case "strong_short":
      return <ArrowDown size={14} className="inline-block" />;
    default:
      return <Minus size={14} className="inline-block" />;
  }
}

export function TechnicalSignalsPanel({ signals }: { signals: AssetSignal[] }) {
  return (
    <div className="mt-6 space-y-4">
      <h3 className="font-semibold text-lg">Technical Signals</h3>

      {signals.map((s) => {
        const rec = getRecommendation(s.rsiSignal, s.bbSignal);
        const recLabel = getRecommendationLabel(rec);
        const recColor = getRecommendationColor(rec);
        const arrow = getArrow(rec);

        // microChart data (last 30 points)
        const micro = s.recentPrices?.map((p, i) => ({ i, p })) ?? [];

        return (
          <div
            key={s.symbol}
            className="p-4 border rounded-lg bg-white shadow-sm flex flex-col gap-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <strong className="text-gray-900 text-base">{s.symbol}</strong>

              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${recColor}`}
              >
                {arrow}
                {recLabel}
              </span>
            </div>

            {/* Micro chart */}
            <div className="h-14">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={micro}>
                  <Line
                    type="monotone"
                    dataKey="p"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Stats */}
            <div className="text-xs text-gray-700 flex justify-between">
              <div>
                Price: <strong>{s.latestPrice.toFixed(2)}</strong>
              </div>
              <div>
                RSI: <strong>{s.rsi.toFixed(2)}</strong>
              </div>
            </div>

            {/* Raw signals */}
            <div className="flex gap-2 text-xs">
              <span>
                RSI signal:{" "}
                <strong className="capitalize">{s.rsiSignal ?? "none"}</strong>
              </span>
              <span>
                BB signal:{" "}
                <strong className="capitalize">{s.bbSignal ?? "none"}</strong>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
