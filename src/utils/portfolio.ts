/* ================================
   portfolio.ts — Portfolio Theory
   ================================ */

import { vectorDot, mean, std } from "./statistics";

export function simpleReturns(prices: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < prices.length; i++) r.push(prices[i] / prices[i - 1] - 1);
  return r;
}

export function logReturns(prices: number[]): number[];
export function logReturns(prices: number[][]): number[][];
export function logReturns(
  prices: number[] | number[][]
): number[] | number[][] {
  if (Array.isArray(prices[0])) {
    // prices is number[][]
    return (prices as number[][]).map((series) =>
      series.slice(1).map((p, i) => Math.log(p / series[i]))
    );
  }

  // prices is number[]
  const p = prices as number[];
  const result: number[] = [];
  for (let i = 1; i < p.length; i++) {
    result.push(Math.log(p[i] / p[i - 1]));
  }
  return result;
}

/** Annualize mean return given periodicity (e.g., 252 trading days, 12 months) */
export function annualizeReturn(meanPeriodic: number, periodsPerYear: number) {
  return (1 + meanPeriodic) ** periodsPerYear - 1;
}

/** Annualize volatility (std dev of periodic returns -> annual) */
export function annualizeVol(stdPeriodic: number, periodsPerYear: number) {
  return stdPeriodic * Math.sqrt(periodsPerYear);
}

// Portfolio expected return (weights dot returns)
export const portfolioReturn = (w: number[], mu: number[]): number =>
  vectorDot(w, mu);

// Portfolio variance: wᵀ Σ w
export const portfolioVariance = (w: number[], cov: number[][]): number => {
  let total = 0;
  for (let i = 0; i < w.length; i++) {
    for (let j = 0; j < w.length; j++) {
      total += w[i] * cov[i][j] * w[j];
    }
  }
  return total;
};

export const portfolioVol = (w: number[], cov: number[][]): number =>
  Math.sqrt(portfolioVariance(w, cov));

export const sharpeRatio = (mu: number, sigma: number, rf = 0): number =>
  (mu - rf) / sigma;

export const sortinoRatio = (returns: number[], rf = 0): number => {
  const downside = returns.filter((r) => r < rf);
  const ds = std(downside);
  const avg = mean(returns);
  return (avg - rf) / ds;
};

// Parametric VaR (Gaussian)
export const varGaussian = (mu: number, sigma: number, alpha = 0.05): number =>
  mu - sigma * inverseNormalCDF(1 - alpha);

// CVaR / Expected Shortfall (Gaussian)
export const cvarGaussian = (
  mu: number,
  sigma: number,
  alpha = 0.05
): number => {
  const z = inverseNormalCDF(alpha);
  return (
    mu - sigma * (Math.exp((-z * z) / 2) / (alpha * Math.sqrt(2 * Math.PI)))
  );
};

// Inverse normal CDF (Acklam)
export function inverseNormalCDF(p: number): number {
  if (p <= 0 || p >= 1) throw new Error("p must be in (0,1)");

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];

  const plow = 0.02425;
  const phigh = 1 - plow;

  let q;

  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }

  if (p > phigh) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }

  q = p - 0.5;
  const r = q * q;
  return (
    ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
      q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  );
}

export function calculateVaRAndES(
  values: number[],
  pValues = [0.9, 0.95, 0.99]
) {
  if (!values || values.length === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  return pValues.map((p) => {
    const cutoff = Math.floor((1 - p) * n);
    const VaR = sorted[cutoff];
    const tail = sorted.slice(0, cutoff + 1);
    const ES =
      tail.length > 0 ? tail.reduce((a, b) => a + b, 0) / tail.length : VaR;
    return { p, VaR, ES };
  });
}

/** Historical VaR at level p (e.g., 0.95) -> return positive VaR value */
export function historicalVaR(returns: number[], p = 0.95) {
  if (!returns.length) return 0;
  const sorted = [...returns].sort((a, b) => a - b);
  const idx = Math.max(0, Math.floor((1 - p) * sorted.length) - 1);
  const varVal = Math.abs(sorted[idx] ?? sorted[0]);
  return varVal;
}

/** Parametric VaR assuming normality */
export function parametricVaR(returns: number[], p = 0.95) {
  const mu = mean(returns);
  const sigma = std(returns);
  // inverse normal quantile for left tail
  const z = inverseNormalCDF(1 - p);
  const varVal = Math.abs(mu + z * sigma);
  return varVal;
}

/** CVaR / Expected Shortfall historical */
export function historicalCVaR(returns: number[], p = 0.95) {
  if (!returns.length) return 0;
  const sorted = [...returns].sort((a, b) => a - b);
  const cutoff = Math.floor((1 - p) * sorted.length);
  const tail = sorted.slice(0, Math.max(1, cutoff));
  const meanTail = tail.reduce((a, b) => a + b, 0) / tail.length;
  return Math.abs(meanTail);
}
