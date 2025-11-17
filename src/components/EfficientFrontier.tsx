// components/EfficientFrontier.tsx
"use client";

import { useMemo } from "react";
import { portfolioReturn, portfolioVariance } from "@/utils/portfolio";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

function generateWeightCombinations(n: number, step = 0.1) {
  // Produces combinations that sum to 1. Caution: explosion in count for large n / small step.
  const results: number[][] = [];

  function helper(idx: number, soFar: number[]) {
    if (idx === n - 1) {
      const sum = soFar.reduce((a, b) => a + b, 0);
      results.push([...soFar, Math.max(0, 1 - sum)]);
      return;
    }
    const sum = soFar.reduce((a, b) => a + b, 0);
    for (let v = 0; v <= 1 - sum + 1e-9; v += step) {
      helper(idx + 1, [...soFar, Number(v.toFixed(6))]);
    }
  }
  helper(0, []);
  return results;
}

export default function EfficientFrontier({
  expectedReturns,
  covMatrix,
  step = 0.1,
}: {
  expectedReturns: number[]; // periodic expected returns
  covMatrix: number[][];
  step?: number;
}) {
  const n = expectedReturns.length;
  const combos = useMemo(() => generateWeightCombinations(n, step), [n, step]);

  const frontier = useMemo(() => {
    return combos.map((w) => {
      const mu = portfolioReturn(w, expectedReturns);
      const varp = portfolioVariance(w, covMatrix);
      return { weights: w, mu, vol: Math.sqrt(varp) };
    });
  }, [combos, expectedReturns, covMatrix]);

  // pick set of min-vol for each return bucket or pareto front
  const pareto = useMemo(() => {
    // sort by mu ascending, find min vol for each mu
    const sorted = [...frontier].sort((a, b) => a.mu - b.mu);
    const pf: { mu: number; vol: number }[] = [];
    for (const p of sorted) {
      if (!pf.length || p.vol < pf[pf.length - 1].vol)
        pf.push({ mu: p.mu, vol: p.vol });
    }
    return pf;
  }, [frontier]);

  return (
    <div className="rounded-lg border p-4 bg-white shadow-sm">
      <h3 className="text-lg font-medium">Efficient Frontier (grid search)</h3>
      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pareto.map((p) => ({ mu: p.mu, vol: p.vol }))}>
            <XAxis
              dataKey="vol"
              tickFormatter={(v) => (v * 100).toFixed(1) + "%"}
            />
            <YAxis
              dataKey="mu"
              tickFormatter={(v) => (v * 100).toFixed(1) + "%"}
            />
            <Tooltip
              formatter={(v: number, name: string) =>
                `${(v * 100).toFixed(2)}%`
              }
            />
            <Line dataKey="mu" name="Return" dot={false} stroke="#ef4444" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
