"use client";

import { useEffect, useMemo, useState } from "react";
import { getHistoricalPrice } from "@/lib/stocks";
import {
  portfolioReturn,
  portfolioVariance,
  annualizeReturn,
  annualizeVol,
  simpleReturns,
} from "@/utils/portfolio";
import { mean, std, covarianceMatrix } from "@/utils/statistics";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { Portfolio } from "@prisma/client";

type Asset = {
  symbol: string;
  name?: string;
  prices?: number[];
  returns?: number[];
};

export default function PortfolioBuilder({
  initial = [{ ticker: "AAPL" }],
  onChange,
}: {
  initial?: Portfolio[];
  onChange?: (portfolio: Portfolio[]) => void;
}) {
  // Initialize assets from initial prop
  const [assets, setAssets] = useState<Asset[]>(
    initial.map((s) => ({ symbol: s.ticker }))
  );
  const [weights, setWeights] = useState<number[]>(
    initial.map((s) => s?.weight || 1 / initial.length)
  );
  const [periodsPerYear] = useState(252);

  // --- 1. SYNC ASSETS/WEIGHTS (Primary Fix) ---
  useEffect(() => {
    // 1. Create a stable representation of the current local state (symbols and weights)
    const currentPortfolioState = JSON.stringify(
      assets.map((a, i) => ({ ticker: a.symbol, weight: weights[i] }))
    );
    // 2. Create a stable representation of the incoming props
    const initialPortfolioProps = JSON.stringify(
      initial.map((s) => ({
        ticker: s.ticker,
        weight: s.weight || 1 / Math.max(1, initial.length),
      }))
    );

    // FIX: Only proceed if the incoming props are structurally different from the current local state
    if (initialPortfolioProps !== currentPortfolioState) {
      const newAssets = initial.map((s) => ({ symbol: s.ticker }));

      // Merge: Try to keep existing prices/returns data for symbols that already exist
      setAssets((prevAssets) => {
        const mergedAssets = newAssets.map((newAsset) => {
          const existingAsset = prevAssets.find(
            (a) => a.symbol === newAsset.symbol
          );
          // Preserve existing price data if the symbol hasn't changed.
          return existingAsset || newAsset;
        });
        return mergedAssets;
      });

      setWeights(
        initial.map((s) => s.weight || 1 / Math.max(1, initial.length))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  // --- 2. FETCH PRICES (Runs when assets list changes or new assets are added) ---
  useEffect(() => {
    let mounted = true;

    // Identify assets that exist in local state but are missing historical data
    const assetsToFetch = assets.filter((a) => !a.prices);

    if (assetsToFetch.length === 0) return; // All data present, exit.

    (async () => {
      // Fetch prices for all assets that still need them
      for (const a of assetsToFetch) {
        if (!mounted) return;

        try {
          const data = await getHistoricalPrice(a.symbol);

          const pricesRaw = (data ?? []).map(
            (d: any) => d.price ?? d.close ?? d.adjClose ?? d.closePrice ?? 0
          );
          const prices = pricesRaw.slice().reverse();
          const returns = simpleReturns(prices);

          if (!mounted) return;

          // Use functional update and findIndex for robust updates
          setAssets((prev) => {
            const index = prev.findIndex((item) => item.symbol === a.symbol);
            if (index === -1) return prev;

            const copy = [...prev];
            copy[index] = { ...copy[index], name: a.symbol, prices, returns };
            return copy;
          });
        } catch (err) {
          console.error("Failed to load historical for", a.symbol, err);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [assets]);

  const commonReturns: number[][] = assets.map((a) =>
    simpleReturns(a.prices ?? [])
  );
  const covMatrix = covarianceMatrix(commonReturns);

  // Local historical VaR & CVaR on a return series
  function historicalVaR(returns: number[], p = 0.95) {
    if (!returns.length) return 0;
    const sorted = [...returns].sort((a, b) => a - b);
    const idx = Math.max(0, Math.floor((1 - p) * sorted.length) - 1);
    return Math.abs(sorted[idx] ?? sorted[0]);
  }
  function historicalCVaR(returns: number[], p = 0.95) {
    if (!returns.length) return 0;
    const sorted = [...returns].sort((a, b) => a - b);
    const cutoff = Math.floor((1 - p) * sorted.length);
    const tail = sorted.slice(0, Math.max(1, cutoff));
    const meanTail = tail.reduce((a, b) => a + b, 0) / tail.length;
    return Math.abs(meanTail);
  }

  // portfolio analytics
  const portfolioAnalytics = useMemo(() => {
    const n = assets.length;
    const rets = assets.map((a) => mean(a.returns ?? []));
    const portRetPeriodic = portfolioReturn(weights, rets);
    const portVar = portfolioVariance(weights, covMatrix);
    const portVol = Math.sqrt(portVar);
    const annRet = annualizeReturn(portRetPeriodic, periodsPerYear);
    const annVol = annualizeVol(portVol, periodsPerYear);

    // build aggregated returns series for VaR/historical
    const aggReturns: number[] = [];
    if (commonReturns.length) {
      const minLen = commonReturns[0].length;
      for (let t = 0; t < minLen; t++) {
        let v = 0;
        for (let i = 0; i < n; i++)
          v += (weights[i] ?? 0) * (commonReturns[i][t] ?? 0);
        aggReturns.push(v);
      }
    }

    // compute sharpe locally from aggReturns (periodic -> annualize)
    const meanPeriodic = mean(aggReturns);
    const stdPeriodic = std(aggReturns);
    const sharpe =
      stdPeriodic === 0
        ? 0
        : (meanPeriodic / stdPeriodic) * Math.sqrt(periodsPerYear);

    return {
      portRetPeriodic,
      annRet,
      portVol,
      annVol,
      sharpe,
      var95: historicalVaR(aggReturns, 0.95),
      cvar95: historicalCVaR(aggReturns, 0.95),
      aggReturns,
    };
  }, [weights, assets, covMatrix, commonReturns, periodsPerYear]);

  const removeAt = (idx: number) => {
    // 1. Calculate the new weights and new assets first
    setAssets((prevAssets) => {
      const newAssets = prevAssets.slice();
      newAssets.splice(idx, 1);

      // Use setWeights' functional update to calculate the new weights
      setWeights((prevWeights) => {
        const newWeights = prevWeights.slice();
        newWeights.splice(idx, 1);
        const sum = newWeights.reduce((a, b) => a + b, 0) || 1;
        const finalWeights = newWeights.map((x) => x / sum);

        // 2. Call onChange immediately after calculating the final state for this interaction
        if (onChange) {
          const updatedPortfolio = newAssets.map((asset, i) => ({
            ticker: asset.symbol,
            weight: finalWeights[i] ?? 0,
            // NOTE: Include other required fields like ID/dates if necessary
          })) as Portfolio[];
          onChange(updatedPortfolio);
        }
        return finalWeights;
      });

      return newAssets;
    });
  };

  const onWeightChange = (i: number, pct: number) => {
    const val = Math.max(0, pct / 100);

    setWeights((prevWeights) => {
      const copy = [...prevWeights];
      copy[i] = val; // Set the new individual weight
      const sum = copy.reduce((a, b) => a + b, 0) || 1;
      const finalWeights = copy.map((x) => x / sum); // Normalize all weights

      // 2. Call onChange immediately after normalization
      if (onChange) {
        const updatedPortfolio = assets.map((asset, j) => ({
          ticker: asset.symbol,
          weight: finalWeights[j] ?? 0,
        })) as Portfolio[];
        onChange(updatedPortfolio);
      }
      return finalWeights;
    });

    // Note: setAssets is NOT called here, only setWeights.
  };

  return (
    <div className="rounded-lg border p-4 bg-white shadow-sm space-y-4">
      <h2 className="text-lg font-medium">Portfolio Builder & Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {assets.map((a, i) => (
          <div key={i} className="p-2 border rounded">
            <div className="flex justify-between items-center">
              <strong>{a.symbol}</strong>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={(weights[i] ?? 0) * 100}
                  onChange={(e) => onWeightChange(i, Number(e.target.value))}
                  className="w-20"
                />
                <button
                  onClick={() => removeAt(i)}
                  className="text-sm text-red-500 px-2 py-1 rounded hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="text-xs mt-1">
              Recent mean return:{" "}
              {(mean(a.returns ?? []) * 252 * 100).toFixed(2)}% (ann)
              <br />
              Vol (ann):{" "}
              {(std(a.returns ?? []) * Math.sqrt(252) * 100).toFixed(2)}%
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold">Portfolio summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div>
            <strong>Ann return:</strong>{" "}
            {(portfolioAnalytics.annRet * 100).toFixed(2)}%
          </div>
          <div>
            <strong>Ann vol:</strong>{" "}
            {(portfolioAnalytics.annVol * 100).toFixed(2)}%
          </div>
          <div>
            <strong>Sharpe:</strong> {portfolioAnalytics.sharpe.toFixed(2)}
          </div>
          <div>
            <strong>VaR 95%:</strong>{" "}
            {(portfolioAnalytics.var95 * 100).toFixed(2)}%
          </div>
          <div>
            <strong>CVaR 95%:</strong>{" "}
            {(portfolioAnalytics.cvar95 * 100).toFixed(2)}%
          </div>
        </div>
      </div>

      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={portfolioAnalytics.aggReturns.map((r, i) => ({ i, r }))}
          >
            <XAxis dataKey="i" />
            <YAxis />
            <Tooltip formatter={(v: number) => (v * 100).toFixed(2) + "%"} />
            <Legend />
            <Line
              name="Portfolio returns"
              dataKey="r"
              dot={false}
              stroke="#2563eb"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
