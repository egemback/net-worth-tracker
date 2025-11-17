/* =====================================
   marketIndicators.ts — Technical Tools
   ===================================== */

// --- CONSTANTS ---
export const BB_PERIOD = 20;
export const BB_DEVIATIONS = 2;
export const RSI_PERIOD = 14;

export const sma = (data: number[], period: number): number[] =>
  data.map((_, i) =>
    i < period - 1
      ? NaN
      : data.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period
  );

export const ema = (data: number[], period: number): number[] => {
  const k = 2 / (period + 1);
  const emaArr = [];
  let prev = data[0];
  emaArr.push(prev);

  for (let i = 1; i < data.length; i++) {
    const val = data[i] * k + prev * (1 - k);
    emaArr.push(val);
    prev = val;
  }
  return emaArr;
};

// RSI (Wilder)
export const rsi = (prices: number[], period = 14): number[] => {
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  const rsiArr = Array(period).fill(NaN);

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgGain / avgLoss;
    rsiArr.push(100 - 100 / (1 + rs));
  }

  return rsiArr;
};

// Bollinger Bands
export const bollingerBands = (prices: number[], period = 20, k = 2) => {
  const middle = sma(prices, period);

  const stdArr = prices.map((_, i) => {
    if (i < period - 1) return NaN;
    const window = prices.slice(i - period + 1, i + 1);
    const m = window.reduce((a, b) => a + b) / period;
    return Math.sqrt(window.reduce((s, v) => s + (v - m) ** 2, 0) / period);
  });

  const upper = middle.map((m, i) => (isNaN(m) ? NaN : m + k * stdArr[i]));
  const lower = middle.map((m, i) => (isNaN(m) ? NaN : m - k * stdArr[i]));

  return { middle, upper, lower };
};
