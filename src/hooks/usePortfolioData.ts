import { useState, useEffect } from "react";
import { getHistoricalPrice } from "@/lib/stocks";
import { mean, covarianceMatrix } from "@/utils/statistics";
import { logReturns } from "@/utils/portfolio";

export function usePortfolioData(symbols: string[]) {
  const [portfolioData, setPortfolioData] = useState<any[]>([]);
  const [expectedReturns, setExpectedReturns] = useState<number[]>([]);
  const [covMatrix, setCovMatrix] = useState<number[][]>([]);

  useEffect(() => {
    if (!symbols.length) return;

    Promise.all(symbols.map((s) => getHistoricalPrice(s))).then((allData) => {
      // allData: [{date, price, ...}, ...]
      const prices: number[][] = allData.map((d) => d.map((p: any) => p.price));
      const logRets = logReturns(prices);

      const mu = logRets.map(mean);
      const cov = covarianceMatrix(logRets);

      setPortfolioData(allData);
      setExpectedReturns(mu);
      setCovMatrix(cov);
    });
  }, [symbols]);

  return { portfolioData, expectedReturns, covMatrix };
}
