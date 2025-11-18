"use client";

import { useState } from "react";
import StockSearch from "@/components/StockSearch";
import PortfolioBuilder from "@/components/PortfolioBuilder";
import EfficientFrontier from "@/components/EfficientFrontier";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { useTechnicalSignals } from "@/hooks/useTechnicalSignals";
import { TechnicalSignalsPanel } from "@/components/TechnicalSignalsPanel";

export default function PortfolioAnalysisPage() {
  const [portfolio, setPortfolio] = useState<string[]>([
    "AAPL",
    "MSFT",
    "TSLA",
  ]);

  const { portfolioData, expectedReturns, covMatrix } =
    usePortfolioData(portfolio);

  // called when StockSearch returns a stock object — add its symbol to the portfolio
  const handleSelectStock = (stock: any) => {
    const symbol = stock?.symbol ?? stock?.ticker ?? stock?.id;
    if (!symbol) return;
    setPortfolio((prev) => {
      if (prev.includes(symbol)) return prev;
      const next = [...prev, symbol];
      return next;
    });
  };

  const signals = useTechnicalSignals(portfolioData);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">
        Portfolio Analysis Tool
      </h1>

      <div className="space-y-4 md:space-y-6">
        <StockSearch onSelectStock={handleSelectStock} />
        <PortfolioBuilder initial={portfolio} onChange={setPortfolio} />
        {expectedReturns.length > 0 && covMatrix.length > 0 ? (
          <EfficientFrontier
            expectedReturns={expectedReturns}
            covMatrix={covMatrix}
            step={0.05}
          />
        ) : (
          <div>Loading portfolio data...</div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Technical Signals
        </h2>
        <TechnicalSignalsPanel signals={signals} />
      </div>
    </div>
  );
}
