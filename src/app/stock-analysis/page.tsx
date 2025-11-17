"use client";

import { useState } from "react";
import StockSearch from "@/components/StockSearch";
import StockOverview from "@/components/StockOverview";
import StockKPIs from "@/components/StockKPIs";
import StockChart from "@/components/StockChart";
import StockFinancials from "@/components/StockFinancials";

export default function StockAnalysisPage() {
  const [selectedStock, setSelectedStock] = useState<any>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">
        Stock Analysis Tool
      </h1>

      <StockSearch onSelectStock={setSelectedStock} />

      {selectedStock && (
        <div className="space-y-6">
          <StockOverview stock={selectedStock} />
          <StockKPIs stock={selectedStock} />
          <StockChart stock={selectedStock} />
          <StockFinancials stock={selectedStock} />
        </div>
      )}
    </div>
  );
}
