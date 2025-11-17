// components/PortfolioMonteCarlo.tsx
"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

/** Simulate future portfolio PnL given current portfolio return distribution (normal approx) */
function simulatePortfolioPaths(
  currentValue: number,
  mu: number,
  vol: number,
  days = 252,
  sims = 1000
) {
  const paths: number[][] = [];
  for (let s = 0; s < sims; s++) {
    let val = currentValue;
    const path = [val];
    for (let d = 0; d < days; d++) {
      // simple geometric Brownian single-step
      const eps = randn();
      val =
        val *
        Math.exp(
          (mu - 0.5 * vol * vol) / days + vol * Math.sqrt(1 / days) * eps
        );
      path.push(val);
    }
    paths.push(path);
  }
  return paths;
}

function randn() {
  // Box-Muller
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export default function PortfolioMonteCarlo({
  currentValue = 100000,
  mu = 0.07,
  vol = 0.15,
}: {
  currentValue?: number;
  mu?: number;
  vol?: number;
}) {
  const sims = useMemo(
    () => simulatePortfolioPaths(currentValue, mu, vol, 252, 400),
    [currentValue, mu, vol]
  );
  // compute percentiles for each day
  const percentiles = useMemo(() => {
    const days = sims[0].length;
    const stats: { day: number; p10: number; p50: number; p90: number }[] = [];
    for (let d = 0; d < days; d++) {
      const arr = sims.map((p) => p[d]).sort((a, b) => a - b);
      const p10 = arr[Math.floor(0.1 * arr.length)];
      const p50 = arr[Math.floor(0.5 * arr.length)];
      const p90 = arr[Math.floor(0.9 * arr.length)];
      stats.push({ day: d, p10, p50, p90 });
    }
    return stats;
  }, [sims]);

  return (
    <div className="rounded-lg border p-4 bg-white shadow-sm">
      <h3 className="text-lg font-medium">
        Monte Carlo Portfolio Simulation (1 year)
      </h3>
      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={percentiles}>
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip formatter={(v: number) => `$${v.toFixed(0)}`} />
            <Area
              type="monotone"
              dataKey="p90"
              fillOpacity={0.1}
              stroke="#10b981"
            />
            <Area
              type="monotone"
              dataKey="p50"
              fillOpacity={0.2}
              stroke="#3b82f6"
            />
            <Area
              type="monotone"
              dataKey="p10"
              fillOpacity={0.05}
              stroke="#ef4444"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
