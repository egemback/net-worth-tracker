"use client";

import { useEffect, useMemo, useState } from "react";
import StockSearch from "@/components/StockSearch";
import PortfolioBuilder from "@/components/PortfolioBuilder";
import EfficientFrontier from "@/components/EfficientFrontier";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { useTechnicalSignals } from "@/hooks/useTechnicalSignals";
import { TechnicalSignalsPanel } from "@/components/TechnicalSignalsPanel";
import { Portfolio } from "@prisma/client";

export default function PortfolioAnalysisPage() {
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPortfolio() {
      try {
        const savedPortfolio = await loadPortfolioFromAPI();
        setPortfolio(savedPortfolio);
      } catch (error) {
        console.error("Failed to load portfolio:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadPortfolio();
  }, []);

  const symbols = useMemo(() => {
    return portfolio.map((s) => s.ticker);
  }, [portfolio]);
  const { portfolioData, expectedReturns, covMatrix } =
    usePortfolioData(symbols);
  const signals = useTechnicalSignals(portfolioData);

  // called when StockSearch returns a stock object — add its symbol to the portfolio
  const handleSelectStock = (stock: any) => {
    const symbol = stock?.symbol ?? stock?.ticker ?? stock?.id;
    if (!symbol) return;
    setPortfolio((prev) => {
      if (prev.map((s) => s.ticker).includes(symbol)) return prev;
      const next = [...prev, { ticker: symbol }];
      return next;
    });
  };

  const handlePortfolioChange = (newPortfolio: Portfolio[]) => {
    setPortfolio((prevPortfolio) => {
      if (prevPortfolio.length === newPortfolio.length) {
        return prevPortfolio; // Returns old reference, stopping the loop
      }
      return newPortfolio; // Content is different, allow update
    });
  };

  async function loadPortfolioFromAPI(): Promise<Portfolio[]> {
    const res = await fetch("/api/portfolio");
    if (res.ok) return res.json();

    // Defaults
    return ["AAPL", "MSFT", "TSLA"];
  }

  async function save() {
    await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ portfolio }),
    });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading portfolio...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="d-flex justify-content-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          Portfolio Analysis Tool
        </h1>

        <form action={save}>
          <button type="submit" className="rounded border px-4 py-2">
            Save Portfolio
          </button>
        </form>
      </div>

      <div className="space-y-4 md:space-y-6">
        <StockSearch onSelectStock={handleSelectStock} />
        {portfolio.length > 0 ? (
          <>
            <PortfolioBuilder
              initial={portfolio}
              onChange={handlePortfolioChange}
            />
            {expectedReturns.length > 0 && covMatrix.length > 0 && (
              <EfficientFrontier
                expectedReturns={expectedReturns}
                covMatrix={covMatrix}
                step={0.05}
              />
            )}
            <div className="mt-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Technical Signals
              </h2>
              <TechnicalSignalsPanel signals={signals} />
            </div>
          </>
        ) : (
          <div className="p-4 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-800">
            Your portfolio is currently empty.
          </div>
        )}
      </div>
    </div>
  );
}
