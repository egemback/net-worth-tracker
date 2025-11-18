"use client";

import { useEffect, useState } from "react";
import { getKeyMetrics, getFinancialRatios } from "@/lib/stocks";
import { formatNumberRaw, formatPercentage } from "@/utils/formatters";

export default function StockKPIs({ stock }: { stock: any }) {
  const [metrics, setMetrics] = useState<any>(null);
  const [ratios, setRatios] = useState<any>(null);

  useEffect(() => {
    getKeyMetrics(stock.symbol).then(setMetrics);
    getFinancialRatios(stock.symbol).then(setRatios);
  }, [stock]);

  if (!metrics || !ratios) return <div>Loading metrics...</div>;

  // ----- KPI Groups -----
  const valuation = [
    {
      label: "P/E Ratio",
      value: formatNumberRaw(ratios.priceToEarningsRatioTTM),
      class: ratios.priceToEarningsRatioTTM < 20,
    },
    {
      label: "P/S Ratio",
      value: formatNumberRaw(ratios.priceToSalesRatioTTM),
      class: ratios.priceToSalesRatioTTM < 5,
    },
    {
      label: "EV / EBITDA",
      value: formatNumberRaw(metrics.evToEBITDATTM),
      class: metrics.evToEBITDATTM < 12,
    },
    {
      label: "Free Cash Flow Yield",
      value: formatPercentage(metrics.freeCashFlowYieldTTM),
      class: metrics.freeCashFlowYieldTTM > 0.05,
    },
  ];

  const profitability = [
    {
      label: "ROE",
      value: formatPercentage(metrics.returnOnEquityTTM),
      class: metrics.returnOnEquityTTM > 0.15,
    },
    {
      label: "ROIC",
      value: formatPercentage(metrics.returnOnInvestedCapitalTTM),
      class: metrics.returnOnInvestedCapitalTTM > 0.1,
    },
    {
      label: "Net Profit Margin",
      value: formatPercentage(ratios.netProfitMarginTTM),
      class: ratios.netProfitMarginTTM > 0.15,
    },
    {
      label: "Gross Margin",
      value: formatPercentage(ratios.grossProfitMarginTTM),
      class: ratios.grossProfitMarginTTM > 0.4,
    },
  ];

  const efficiency = [
    {
      label: "Asset Turnover",
      value: formatNumberRaw(ratios.assetTurnoverTTM),
      class: ratios.assetTurnoverTTM > 1,
    },
    {
      label: "Inventory Turnover",
      value: formatNumberRaw(ratios.inventoryTurnoverTTM),
      class: ratios.inventoryTurnoverTTM > 5,
    },
    {
      label: "Operating Cycle (days)",
      value: formatNumberRaw(metrics.operatingCycleTTM),
      class: metrics.operatingCycleTTM < 60,
    },
  ];

  const financialHealth = [
    {
      label: "Debt / Equity",
      value: formatNumberRaw(ratios.debtToEquityRatioTTM),
      class: ratios.debtToEquityRatioTTM < 1,
    },
    {
      label: "Current Ratio",
      value: formatNumberRaw(ratios.currentRatioTTM),
      class: ratios.currentRatioTTM > 1,
    },
    {
      label: "Cash Ratio",
      value: formatNumberRaw(ratios.cashRatioTTM),
      class: ratios.cashRatioTTM > 0.2,
    },
    {
      label: "Net Debt / EBITDA",
      value: formatNumberRaw(metrics.netDebtToEBITDATTM),
      class: metrics.netDebtToEBITDATTM < 2,
    },
  ];

  // ----- Render -----
  return (
    <div className="rounded-xl border p-5 bg-white shadow-sm space-y-6">
      <h2 className="text-xl font-semibold">Fundamental Overview</h2>

      {/* Valuation */}
      <Section title="Valuation" items={valuation} />

      {/* Profitability */}
      <Section title="Profitability" items={profitability} />

      {/* Efficiency */}
      <Section title="Operational Efficiency" items={efficiency} />

      {/* Financial Health */}
      <Section title="Financial Health" items={financialHealth} />
    </div>
  );
}

// ----- Subcomponent -----
function Section({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: any; class: boolean }[];
}) {
  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-2">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {items.map((item) => (
          <div key={item.label}>
            <div className="text-gray-600">{item.label}</div>
            <div
              className={
                item.class
                  ? "text-green-600 font-medium"
                  : "text-red-600 font-medium"
              }
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
