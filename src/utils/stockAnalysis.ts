// --- CONSTANTS ---
export const BB_PERIOD = 20;
export const BB_DEVIATIONS = 2;
export const RSI_PERIOD = 14;

/**
 * Calculates the Simple Moving Average (SMA) for a given period.
 * @param {Array<number>} prices - Array of prices.
 * @param {number} period - Lookback period.
 * @param {number} index - Current data point index.
 * @returns {number|null} SMA value or null if period is not met.
 */
const calculateSMA = (prices, period, index) => {
  if (index < period - 1) return null;
  const slice = prices.slice(index - period + 1, index + 1);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
};

/**
 * Calculates Bollinger Bands (BB): Upper, Middle (SMA), and Lower.
 * @param {Array<object>} data - The dataset to modify.
 * @returns {Array<object>} Data augmented with BB values.
 */
export const calculateBollingerBands = (data) => {
  const prices = data.map((d) => d.price);

  for (let i = 0; i < data.length; i++) {
    const sma = calculateSMA(prices, BB_PERIOD, i);

    if (sma !== null) {
      // Calculate Standard Deviation
      const slice = prices.slice(i - BB_PERIOD + 1, i + 1);
      const sumOfSquares = slice.reduce(
        (acc, price) => acc + Math.pow(price - sma, 2),
        0
      );
      const standardDeviation = Math.sqrt(sumOfSquares / BB_PERIOD);

      data[i].bb_middle = sma;
      data[i].bb_upper = sma + BB_DEVIATIONS * standardDeviation;
      data[i].bb_lower = sma - BB_DEVIATIONS * standardDeviation;
    } else {
      data[i].bb_middle = null;
      data[i].bb_upper = null;
      data[i].bb_lower = null;
    }
  }
  return data;
};

/**
 * Calculates the Relative Strength Index (RSI) using Wilder's smoothing.
 * @param {Array<object>} data - The dataset to modify.
 * @returns {Array<object>} Data augmented with RSI values.
 */
export const calculateRSI = (data) => {
  let avgGain = null;
  let avgLoss = null;

  for (let i = 1; i < data.length; i++) {
    const price = data[i].price;
    const prevPrice = data[i - 1].price;
    const change = price - prevPrice;

    const gain = Math.max(0, change);
    const loss = Math.max(0, -change); // Positive value for loss

    // Initial Calculation (Simple Average)
    if (i === RSI_PERIOD) {
      const initialGains = data.slice(1, RSI_PERIOD + 1).map((d, index) => {
        const initialChange = d.price - data[index].price;
        return Math.max(0, initialChange);
      });
      const initialLosses = data.slice(1, RSI_PERIOD + 1).map((d, index) => {
        const initialChange = d.price - data[index].price;
        return Math.max(0, -initialChange);
      });

      avgGain = initialGains.reduce((a, b) => a + b, 0) / RSI_PERIOD;
      avgLoss = initialLosses.reduce((a, b) => a + b, 0) / RSI_PERIOD;
    }

    // Wilder's Smoothing (Subsequent Calculation)
    if (i > RSI_PERIOD) {
      avgGain = (avgGain * (RSI_PERIOD - 1) + gain) / RSI_PERIOD;
      avgLoss = (avgLoss * (RSI_PERIOD - 1) + loss) / RSI_PERIOD;
    }

    // Calculate RSI
    if (avgGain !== null && avgLoss !== null) {
      const rs = avgLoss === 0 ? (avgGain > 0 ? 1000 : 0) : avgGain / avgLoss; // Handle division by zero
      data[i].rsi = 100 - 100 / (1 + rs);
    } else {
      data[i].rsi = null;
    }
  }

  // Set the first RSI_PERIOD points to null as the calculation hasn't initialized
  for (let i = 0; i <= RSI_PERIOD; i++) {
    if (data[i]) data[i].rsi = null;
  }

  return data;
};
