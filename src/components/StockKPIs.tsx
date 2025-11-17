"use client";

import { useEffect, useState } from "react";
import { getKeyMetrics, getFinancialRatios } from "@/lib/stocks";

export default function StockKPIs({ stock }: { stock: any }) {
  const [metrics, setMetrics] = useState<any>(null);
  const [ratios, setRatios] = useState<any>(null);

  useEffect(() => {
    getKeyMetrics(stock.symbol).then(setMetrics);
    getFinancialRatios(stock.symbol).then(setRatios);
  }, [stock]);

  if (!metrics || !ratios) return <div>Loading metrics...</div>;

  const data = [
    { label: "P/E Ratio", value: ratios.peRatioTTM },
    { label: "ROE (%)", value: (ratios.returnOnEquityTTM * 100).toFixed(2) },
    {
      label: "Profit Margin (%)",
      value: (ratios.netProfitMarginTTM * 100).toFixed(2),
    },
    { label: "Debt/Equity", value: ratios.debtEquityRatioTTM },
    {
      label: "Dividend Yield",
      value: (ratios.dividendYieldTTM * 100).toFixed(2),
    },
    { label: "P/B Ratio", value: ratios.pbRatioTTM },
  ];

  return (
    <div className="rounded-lg border p-4 bg-white shadow-sm">
      <h2 className="text-lg font-medium mb-2">Key Performance Indicators</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        {data.map((m) => (
          <div key={m.label}>
            <strong>{m.label}:</strong> {m.value || "N/A"}
          </div>
        ))}
      </div>
    </div>
  );
}
