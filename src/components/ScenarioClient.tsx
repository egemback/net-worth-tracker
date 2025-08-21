"use client";

import { useMemo, useState } from "react";
import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from "recharts";

// Note: This client component focuses on UI and uses props; data and heavy computations happen on the server page.
export default function ScenarioClient({
  baseNetWorth = 0,
  assets = [],
  liabilities = [],
}: any) {
  const [years, setYears] = useState(30);
  const [trials, setTrials] = useState(200);
  const [volatility, setVolatility] = useState(10); // % annual std dev

  // Helper to format large numbers
  function formatNumber(n: number) {
    if (Math.abs(n) >= 1_000_000)
      return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (Math.abs(n) >= 1_000)
      return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
    return n.toLocaleString();
  }

  // Move simulatePath outside useMemo so it can be reused
  function boxMuller() {
    let u = 0,
      v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  function simulatePath() {
    const months = years * 12;
    const monthlyGrowths = assets.map((a: any) => ({
      value: Number(a.value) || 0,
      growth: (Number(a.growthRate) || 0) / 100 / 12,
      contrib: Number(a.monthlyContribution) || 0,
    }));
    const monthlyDebts = liabilities.map((l: any) => ({
      bal: Number(l.balance) || 0,
      rate: (Number(l.interestRate) || 0) / 100 / 12,
      pay: Number(l.monthlyPayment) || 0,
      term: Number(l.termMonths) || 0,
    }));
    let value = baseNetWorth;
    const points: number[] = [];
    for (let m = 0; m <= months; m++) {
      points.push(value);
      // randomize asset returns this month
      for (const a of monthlyGrowths) {
        const monthlySigma = volatility / 100 / Math.sqrt(12);
        const z = boxMuller();
        const rnd = a.growth + monthlySigma * z;
        a.value = a.value * (1 + rnd) + a.contrib;
      }
      // amortize debts
      for (const d of monthlyDebts) {
        if (d.bal <= 0) continue;
        d.bal = d.bal * (1 + d.rate);
        const p = Math.min(d.pay || 0, d.bal);
        d.bal -= p;
        if (d.term && d.term > 0) d.term -= 1;
      }
      const totA = monthlyGrowths.reduce((s: number, a: any) => s + a.value, 0);
      const totL = monthlyDebts.reduce((s: number, l: any) => s + l.bal, 0);
      value = totA - totL;
    }
    return points;
  }

  const series = useMemo(() => {
    // Deterministic forecast + Monte Carlo percentiles (p10/p50/p90)
    const months = years * 12;
    const monthlyPoints: any[] = [];

    const monthlyGrowths = assets.map((a: any) => ({
      value: Number(a.value) || 0,
      growth: (Number(a.growthRate) || 0) / 100 / 12,
      contrib: Number(a.monthlyContribution) || 0,
    }));
    const monthlyDebts = liabilities.map((l: any) => ({
      bal: Number(l.balance) || 0,
      rate: (Number(l.interestRate) || 0) / 100 / 12,
      pay: Number(l.monthlyPayment) || 0,
      term: Number(l.termMonths) || 0,
    }));

    function stepDeterministic(cur: number) {
      let totalAssets = 0;
      for (const a of monthlyGrowths) {
        totalAssets += a.value = a.value * (1 + a.growth) + a.contrib;
      }
      let totalLiabs = 0;
      for (const d of monthlyDebts) {
        if (d.bal <= 0) continue;
        d.bal = d.bal * (1 + d.rate);
        const p = Math.min(d.pay || 0, d.bal);
        d.bal -= p;
        if (d.term && d.term > 0) d.term -= 1;
        totalLiabs += d.bal;
      }
      return totalAssets - totalLiabs;
    }

    // Build deterministic path
    let nw = baseNetWorth;
    for (let m = 0; m <= months; m++) {
      monthlyPoints.push({ month: m, netWorth: nw });
      nw = stepDeterministic(nw);
    }

    // Monte Carlo paths for percentile bands
    const p50 = [...monthlyPoints];
    const p10 = monthlyPoints.map((p) => ({ ...p }));
    const p90 = monthlyPoints.map((p) => ({ ...p }));

    function percentile(arr: number[], p: number) {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = Math.floor((p / 100) * (sorted.length - 1));
      return sorted[idx];
    }

    const paths: number[][] = [];
    for (let t = 0; t < trials; t++) paths.push(simulatePath());

    const band = monthlyPoints.map((p, i) => {
      const vals = paths.map((path) => path[i]);
      return {
        month: p.month,
        p10: percentile(vals, 10),
        p50: percentile(vals, 50),
        p90: percentile(vals, 90),
      };
    });

    return { monthlyPoints, band };
  }, [years, trials, volatility, baseNetWorth, assets, liabilities]);

  const chartData = useMemo(() => {
    return series.band.map((b: any) => ({
      month: b.month,
      p10: b.p10,
      p50: b.p50,
      p90: b.p90,
    }));
  }, [series]);

  // Calculate mean end net worth
  const meanEndNetWorth = useMemo(() => {
    // Use the last value of each path
    if (!series || !series.band || !series.band.length) return 0;
    const lastMonth = series.band.length - 1;
    const paths: number[][] = [];
    for (let t = 0; t < trials; t++) paths.push(simulatePath());
    const ends = paths.map((path) => path[lastMonth]);
    const mean = ends.reduce((s, v) => s + v, 0) / (ends.length || 1);
    return mean;
  }, [series, trials, baseNetWorth, assets, liabilities, volatility, years]);

  return (
    <div className="space-y-4">
      <div className="mb-2 text-lg font-semibold">
        Mean End Net Worth:{" "}
        <span className="text-blue-700">{formatNumber(meanEndNetWorth)}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-sm">
          Years
          <input
            className="ml-2 border rounded px-2 py-1 w-24"
            type="number"
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          Trials
          <input
            className="ml-2 border rounded px-2 py-1 w-24"
            type="number"
            value={trials}
            onChange={(e) => setTrials(Number(e.target.value))}
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
      </div>
      <div className="w-full h-80">
        <ResponsiveContainer>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={formatNumber} />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="p10"
              stroke="#fecaca"
              fill="#fee2e2"
            />
            <Area
              type="monotone"
              dataKey="p90"
              stroke="#bbf7d0"
              fill="#dcfce7"
            />
            <Line
              type="monotone"
              dataKey="p50"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
