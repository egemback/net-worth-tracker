"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  LineChart,
  Brush,
} from "recharts";
import { Asset, Liability } from "@prisma/client";
import { ZoomAndPan } from "./ZoomAndPan";
import { calculateVaRAndES } from "@/utils/statistics";
import { formatNumber } from "@/utils/formatters";

interface ScenarioClientProps {
  baseNetWorth?: number;
  assets?: Asset[];
  liabilities?: Liability[];
}

/**
 * ScenarioClient: Monte Carlo net worth projection
 * Accepts baseNetWorth, assets, and liabilities from snapshot state
 */
export default function ScenarioClient({
  baseNetWorth = 0,
  assets = [],
  liabilities = [],
}: ScenarioClientProps) {
  const [years, setYears] = useState(30);
  const [trials, setTrials] = useState(200);
  const [volatility, setVolatility] = useState(10); // % annual std dev

  // Optimizer controls
  const [minVol, setMinVol] = useState(0);
  const [maxVol, setMaxVol] = useState(30);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<null | {
    bestVol: number;
    table: {
      vol: number;
      mean: number;
      probPositive: number;
      VaR95: number;
      ES95: number;
    }[];
  }>(null);

  const boxMuller = useCallback((): number => {
    let u = 0,
      v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }, []);

  // Simulate a single random net worth path
  const simulatePath = useCallback(
    (vol: number): number[] => {
      if (vol === undefined) {
        vol = volatility;
      }

      const months = years * 12;

      const monthlyAssets = assets.map((a) => ({
        value: Number(a.value) || 0,
        growth: (Number(a.growthRate) || 0) / 100 / 12,
        contrib: Number(a.monthlyContribution) || 0,
      }));

      const monthlyLiabs = liabilities.map((l) => ({
        bal: Number(l.balance) || 0,
        rate: (Number(l.interestRate) || 0) / 100 / 12,
        pay: Number(l.monthlyPayment) || 0,
        term: Number(l.termMonths) || 0,
      }));

      const path: number[] = [];
      let value = baseNetWorth;

      for (let m = 0; m <= months; m++) {
        path.push(value);

        // Update assets stochastically
        for (const a of monthlyAssets) {
          const monthlySigma = vol / 100 / Math.sqrt(12);
          const z = boxMuller();
          const rnd = a.growth + monthlySigma * z;
          a.value = a.value * (1 + rnd) + a.contrib;
        }

        // Update liabilities amortization
        for (const d of monthlyLiabs) {
          if (d.bal <= 0) continue;
          d.bal = d.bal * (1 + d.rate);
          const payment = Math.min(d.pay, d.bal);
          d.bal -= payment;
          if (d.term && d.term > 0) d.term -= 1;
        }

        const totA = monthlyAssets.reduce((s, a) => s + a.value, 0);
        const totL = monthlyLiabs.reduce((s, l) => s + l.bal, 0);
        value = totA - totL;
      }

      return path;
    },
    [years, assets, liabilities, baseNetWorth, volatility, boxMuller]
  );

  // Compute simulation series
  const series = useMemo(() => {
    const months = years * 12;

    // Deterministic baseline
    const monthlyAssets = assets.map((a) => ({
      value: Number(a.value) || 0,
      growth: (Number(a.growthRate) || 0) / 100 / 12,
      contrib: Number(a.monthlyContribution) || 0,
    }));
    const monthlyLiabs = liabilities.map((l) => ({
      bal: Number(l.balance) || 0,
      rate: (Number(l.interestRate) || 0) / 100 / 12,
      pay: Number(l.monthlyPayment) || 0,
      term: Number(l.termMonths) || 0,
    }));

    let nw = baseNetWorth;
    const baseline: { month: number; netWorth: number }[] = [];

    for (let m = 0; m <= months; m++) {
      baseline.push({ month: m, netWorth: nw });

      let totalA = 0;
      for (const a of monthlyAssets) {
        a.value = a.value * (1 + a.growth) + a.contrib;
        totalA += a.value;
      }

      let totalL = 0;
      for (const d of monthlyLiabs) {
        if (d.bal <= 0) continue;
        d.bal = d.bal * (1 + d.rate);
        const pay = Math.min(d.pay, d.bal);
        d.bal -= pay;
        if (d.term && d.term > 0) d.term -= 1;
        totalL += d.bal;
      }

      nw = totalA - totalL;
    }

    // Monte Carlo percentile bands
    const allPaths = Array.from({ length: trials }, simulatePath);
    const percentile = (arr: number[], p: number) => {
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = Math.floor((p / 100) * (sorted.length - 1));
      return sorted[idx];
    };

    const band = baseline.map((b, i) => {
      const vals = allPaths.map((path) => path[i]);
      return {
        month: b.month,
        p10: percentile(vals, 10),
        p50: percentile(vals, 50),
        p90: percentile(vals, 90),
      };
    });

    return { baseline, band };
  }, [years, assets, liabilities, baseNetWorth, trials, simulatePath]);

  const chartData = useMemo(
    () =>
      series.band.map((b) => ({
        month: b.month,
        p10: b.p10,
        p50: b.p50,
        p90: b.p90,
      })),
    [series]
  );

  const riskScores = useMemo(() => {
    const assetRisk =
      assets.reduce((total, asset) => {
        return total + (asset.riskLevel || 3) * Number(asset.value);
      }, 0) / (assets.reduce((sum, a) => sum + Number(a.value), 0) || 1);

    const liquidityScore =
      assets.reduce((total, asset) => {
        return (
          total + (asset.category === "Cash" ? 1 : 0) * Number(asset.value)
        );
      }, 0) / (assets.reduce((sum, a) => sum + Number(a.value), 0) || 1);

    const debtRatio =
      liabilities.reduce((sum, l) => sum + Number(l.balance), 0) /
      (assets.reduce((sum, a) => sum + Number(a.value), 0) || 1);

    return {
      assetRisk: assetRisk / 5, // Normalize to 0-1
      liquidityScore,
      debtRatio,
      overallRisk: (assetRisk / 5 + (1 - liquidityScore) + debtRatio) / 3,
    };
  }, [assets, liabilities]);

  const meanEndNetWorth = useMemo(() => {
    const paths = Array.from({ length: trials }, simulatePath);
    const ends = paths.map((path) => path[path.length - 1]);
    return ends.reduce((s, v) => s + v, 0) / (ends.length || 1);
  }, [trials, simulatePath]);

  const riskMetrics = useMemo(() => {
    const paths = Array.from({ length: trials }, simulatePath);
    const endValues = paths.map((path) => path[path.length - 1]);
    return calculateVaRAndES(endValues, [0.9, 0.95, 0.99]);
  }, [trials, simulatePath]);

  async function runVolatilityOptimization() {
    setOptimizing(true);
    await new Promise((r) => setTimeout(r, 10));

    const vols: number[] = [];
    for (let i = minVol; i <= maxVol; i++) {
      vols.push(Number(i));
    }

    const results: {
      vol: number;
      mean: number;
      probPositive: number;
      VaR95: number;
      ES95: number;
    }[] = [];

    const SIMULATION_SETS = 5; // Run 5 sets of trials for each volatility

    for (const vol of vols) {
      let totalMean = 0;
      let totalProbPositive = 0;
      let totalVaR95 = 0;
      let totalES95 = 0;

      for (let set = 0; set < SIMULATION_SETS; set++) {
        const paths: number[][] = [];
        for (let t = 0; t < trials; t++) {
          paths.push(simulatePath(vol));
        }
        const ends = paths.map((p) => p[p.length - 1]);
        totalMean += ends.reduce((s, v) => s + v, 0) / (ends.length || 1);
        totalProbPositive +=
          ends.filter((v) => v > 0).length / (ends.length || 1);
        const VaRAndES = calculateVaRAndES(ends, [0.95]);
        totalVaR95 += VaRAndES.at(0)?.VaR || 0;
        totalES95 += VaRAndES.at(0)?.ES || 0;
      }

      results.push({
        vol,
        mean: totalMean / SIMULATION_SETS,
        probPositive: totalProbPositive / SIMULATION_SETS,
        VaR95: totalVaR95 / SIMULATION_SETS,
        ES95: totalES95 / SIMULATION_SETS,
      });
    }

    results.sort((a, b) => {
      if (b.probPositive !== a.probPositive)
        return b.probPositive - a.probPositive;
      return b.mean - a.mean;
    });

    const best = results[0];
    setOptimizationResult({ bestVol: best.vol, table: results });
    setOptimizing(false);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-lg font-semibold mb-2">
        Mean End Net Worth:{" "}
        <span className="text-blue-700">{formatNumber(meanEndNetWorth)}</span>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-sm">
          Years
          <input
            className="ml-2 border rounded px-2 py-1 w-24"
            type="number"
            value={years}
            onChange={(e) => setYears(Math.max(1, Number(e.target.value)))}
          />
        </label>
        <label className="text-sm">
          Trials
          <input
            className="ml-2 border rounded px-2 py-1 w-24"
            type="number"
            value={trials}
            onChange={(e) => setTrials(Math.max(10, Number(e.target.value)))}
          />
        </label>
        <label className="text-sm">
          Volatility %
          <input
            className="ml-2 border rounded px-2 py-1 w-24"
            type="number"
            value={volatility}
            onChange={(e) => setVolatility(Number(e.target.value))}
          />
        </label>

        {/* Optimizer inputs */}
        <div className="sm:col-span-3 flex items-center mt-2">
          <span className="mr-2 text-sm">Optimize Volatility Range %:</span>
          <label className="text-sm">
            From
            <input
              className="ml-2 border rounded px-2 py-1 w-24"
              type="number"
              value={minVol}
              onChange={(e) => setMinVol(Number(e.target.value))}
            />
          </label>
          <label className="px-2 text-sm">
            to
            <input
              className="ml-2 border rounded px-2 py-1 w-24"
              type="number"
              value={maxVol}
              onChange={(e) => setMaxVol(Number(e.target.value))}
            />
          </label>
          <button
            onClick={() => runVolatilityOptimization()}
            className="ml-2 rounded bg-blue-600 px-3 py-1 text-white"
            disabled={optimizing}
          >
            {optimizing ? "Optimizing..." : "Find optimal volatility"}
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-[500px]">
        <ResponsiveContainer>
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 0, bottom: 40 }}
          >
            <defs>
              {/* Gradient for the confidence band */}
              <linearGradient id="colorBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00ff5e" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#ff0000" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis
              dataKey="month"
              stroke="#64748b"
              tickLine={false}
              axisLine={false}
              tickFormatter={(m) => (m % 12 === 0 ? `Y${m / 12}` : "")}
            />
            <YAxis
              tickFormatter={formatNumber}
              stroke="#64748b"
              tickLine={false}
              axisLine={false}
            />

            {/* Tooltip */}
            <Tooltip
              formatter={(value: number) => [formatNumber(value), "SEK"]}
              contentStyle={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
              labelStyle={{ color: "#475569" }}
            />

            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              wrapperStyle={{
                paddingBottom: "8px",
              }}
            />

            {/* Lines */}
            <Line
              type="monotone"
              dataKey="p10"
              stroke="#ef4444"
              name="Pessimistic (10%)"
              strokeWidth={1.5}
              dot={false}
              animationDuration={600}
            />
            <Line
              type="monotone"
              dataKey="p90"
              stroke="#10b981"
              name="Optimistic (90%)"
              strokeWidth={1.5}
              dot={false}
              animationDuration={600}
            />
            <Line
              type="monotone"
              dataKey="p50"
              stroke="#2563eb"
              name="Median (50%)"
              strokeWidth={2.5}
              dot={false}
              animationDuration={800}
            />

            {/* Brush for zooming */}
            <Brush
              dataKey="month"
              height={16}
              stroke="#010a1fff"
              travellerWidth={10}
              tickFormatter={(m) => (m % 12 === 0 ? `Y${m / 12}` : "")}
            />
            <ZoomAndPan />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Value at Risk and Expected Shortfall */}
      <div className="mt-8 space-y-6">
        <div>
          <h3 className="text-md font-semibold mb-3">
            Portfolio Risk Analysis
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border p-4">
              <div className="text-sm text-gray-600">Asset Risk</div>
              <div className="text-lg font-semibold">
                {(riskScores.assetRisk * 100).toFixed(1)}%
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${riskScores.assetRisk * 100}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-sm text-gray-600">Liquidity Score</div>
              <div className="text-lg font-semibold">
                {(riskScores.liquidityScore * 100).toFixed(1)}%
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${riskScores.liquidityScore * 100}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-sm text-gray-600">Debt Ratio</div>
              <div className="text-lg font-semibold">
                {(riskScores.debtRatio * 100).toFixed(1)}%
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{ width: `${riskScores.debtRatio * 100}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-sm text-gray-600">Overall Risk</div>
              <div className="text-lg font-semibold">
                {(riskScores.overallRisk * 100).toFixed(1)}%
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    riskScores.overallRisk > 0.66
                      ? "bg-red-500"
                      : riskScores.overallRisk > 0.33
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${riskScores.overallRisk * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-md font-semibold mb-3">
            Risk Metrics (End of Forecast)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border rounded-lg shadow-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
                    Confidence Level
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                    Value at Risk (VaR)
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                    Expected Shortfall (ES)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {riskMetrics.map(({ p, VaR, ES }) => (
                  <tr key={p}>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {(p * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-700">
                      {VaR.toLocaleString("sv-SE", {
                        maximumFractionDigits: 0,
                      })}{" "}
                      SEK
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-700">
                      {ES.toLocaleString("sv-SE", { maximumFractionDigits: 0 })}{" "}
                      SEK
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Optimization results */}
      {optimizationResult && (
        <div className="mt-6">
          <h3 className="text-md font-semibold mb-2">
            Volatility Optimization
          </h3>
          <div className="mb-2">
            <div>
              Recommended volatility:{" "}
              <strong>{optimizationResult.bestVol}%</strong>
            </div>
            <div className="text-sm text-gray-500">
              Recommendation rule: maximize P(end &gt; 0), tie-breaker mean end
              net worth.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border rounded-lg shadow-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-semibold">
                    Volatility %
                  </th>
                  <th className="px-3 py-2 text-right text-sm font-semibold">
                    Mean End
                  </th>
                  <th className="px-3 py-2 text-right text-sm font-semibold">
                    P(end &gt; 0)
                  </th>
                  <th className="px-3 py-2 text-right text-sm font-semibold">
                    VaR95 (loss)
                  </th>
                  <th className="px-3 py-2 text-right text-sm font-semibold">
                    ES95 (loss)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {optimizationResult.table.slice(0, 5).map((r) => (
                  <tr key={r.vol}>
                    <td className="px-3 py-2 text-sm text-gray-700">
                      {r.vol}%
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-gray-700">
                      {formatNumber(r.mean)} SEK
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-gray-700">
                      {(r.probPositive * 100).toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-gray-700">
                      {formatNumber(r.VaR95)} SEK
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-gray-700">
                      {formatNumber(r.ES95)} SEK
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
