/* ================================
   quantMath.ts — Statistical Tools
   ================================ */

export function mean(x: number[]) {
  if (!x.length) return 0;
  return x.reduce((a, b) => a + b, 0) / x.length;
}

export const variance = (arr: number[]): number => {
  const m = mean(arr);
  return mean(arr.map((v) => (v - m) ** 2));
};

export const std = (arr: number[]): number => Math.sqrt(variance(arr));

export const covariance = (a: number[], b: number[]): number => {
  const ma = mean(a);
  const mb = mean(b);
  return mean(a.map((v, i) => (v - ma) * (b[i] - mb)));
};

export const correlation = (a: number[], b: number[]): number =>
  covariance(a, b) / (std(a) * std(b));

export const vectorDot = (a: number[], b: number[]): number =>
  a.reduce((sum, v, i) => sum + v * b[i], 0);

export const vectorSum = (arr: number[]): number =>
  arr.reduce((s, v) => s + v, 0);

export const normalize = (arr: number[]): number[] => {
  const max = Math.max(...arr);
  const min = Math.min(...arr);
  return arr.map((v) => (v - min) / (max - min));
};

export function covarianceMatrix(returns: number[][]) {
  const n = returns.length;
  const m = returns[0].length;
  const mu = returns.map(mean);
  const cov: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let sum = 0;
      for (let t = 0; t < m; t++) {
        sum += (returns[i][t] - mu[i]) * (returns[j][t] - mu[j]);
      }
      cov[i][j] = sum / (m - 1);
      cov[j][i] = cov[i][j];
    }
  }
  return cov;
}

// Rolling window helper
export const rollingWindow = (arr: number[], size: number): number[][] => {
  const result: number[][] = [];
  for (let i = 0; i <= arr.length - size; i++) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

// Linear Regression (OLS)
export function linearRegression(x: number[], y: number[]) {
  const mx = mean(x);
  const my = mean(y);

  const num = x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0);
  const den = x.reduce((s, v) => s + (v - mx) ** 2, 0);

  const beta1 = num / den;
  const beta0 = my - beta1 * mx;

  return {
    slope: beta1,
    intercept: beta0,
  };
}

// Standard Normal PDF
export function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// Standard Normal CDF (Abramowitz & Stegun approximation)
export function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1 / (1 + p * x);
  const y =
    1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1 + sign * y);
}
