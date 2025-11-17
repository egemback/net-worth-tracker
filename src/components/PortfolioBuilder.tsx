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

type Asset = {
  symbol: string;
  name?: string;
  prices?: number[];
  returns?: number[];
};

export default function PortfolioBuilder({
  initial = ["AAPL", "MSFT"],
  onChange,
}: {
  initial?: string[];
  onChange?: (symbols: string[]) => void;
}) {
  // Initialize assets from initial prop
  const [assets, setAssets] = useState<Asset[]>(
    initial.map((s) => ({ symbol: s }))
  );
  const [weights, setWeights] = useState<number[]>(
    initial.map(() => 1 / initial.length)
  );
  const [periodsPerYear] = useState(252);

  // Sync when `initial` changes externally (e.g., StockSearch added a symbol)
  useEffect(() => {
    // If the initial array differs from current symbols, replace assets
    const currentSymbols = assets.map((a) => a.symbol);
    const equal =
      initial.length === currentSymbols.length &&
      initial.every((s, i) => s === currentSymbols[i]);
    if (!equal) {
      setAssets(initial.map((s) => ({ symbol: s })));
      setWeights(initial.map(() => 1 / Math.max(1, initial.length)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  // Fetch historical prices when new symbols appear (only once per symbol)
  useEffect(() => {
    let mounted = true;
    const symbolsToFetch = assets
      .map((a) => a.symbol)
      .filter((sym, idx) => !assets[idx].prices);

    // If there are no assets without prices, exit
    if (!symbolsToFetch.length) return;

    (async () => {
      for (let i = 0; i < assets.length; i++) {
        const a = assets[i];
        if (a.prices) continue;
        try {
          const data = await getHistoricalPrice(a.symbol);
          // extract price field (try multiple keys)
          const pricesRaw = (data ?? []).map(
            (d: any) => d.price ?? d.close ?? d.adjClose ?? d.closePrice ?? 0
          );
          // ensure we have oldest -> newest
          const prices = pricesRaw.slice().reverse();
          const returns = simpleReturns(prices);
          if (!mounted) return;
          setAssets((prev) => {
            const copy = [...prev];
            copy[i] = { ...copy[i], name: a.symbol, prices, returns };
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
    // Only depend on list of symbols to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets.map((a) => a.symbol).join(",")]);

  // When assets change, notify parent (if provided)
  useEffect(() => {
    if (onChange) onChange(assets.map((a) => a.symbol));
  }, [assets, onChange]);

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

  // add asset (symbol) from outside
  const addSymbol = (symbol: string) => {
    setAssets((prev) => {
      if (prev.some((a) => a.symbol === symbol)) return prev;
      const next = [...prev, { symbol }];
      // normalize weights
      setWeights((w) => {
        const newW = [...w, 1 / next.length];
        const s = newW.reduce((a, b) => a + b, 0);
        return newW.map((x) => x / s);
      });
      return next;
    });
  };

  const removeAt = (idx: number) => {
    setAssets((prev) => {
      const copy = prev.slice();
      copy.splice(idx, 1);
      // adjust weights proportionally
      setWeights((w) => {
        const newW = w.slice();
        newW.splice(idx, 1);
        const s = newW.reduce((a, b) => a + b, 0) || 1;
        return newW.map((x) => x / s);
      });
      return copy;
    });
  };

  const onWeightChange = (i: number, pct: number) => {
    const val = Math.max(0, pct / 100);
    setWeights((prev) => {
      const copy = [...prev];
      copy[i] = val;
      const s = copy.reduce((a, b) => a + b, 0) || 1;
      return copy.map((x) => x / s);
    });
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
