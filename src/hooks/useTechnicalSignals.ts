import { useMemo } from "react";
import { rsi, bollingerBands } from "@/utils/marketIndicators"; // your functions

type PricePoint = {
  date: string;
  price: number;
  volume: number;
  symbol: string;
};

export type AssetSignal = {
  symbol: string;
  rsi: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  latestPrice: number;
  rsiSignal: "long" | "short" | null;
  bbSignal: "long" | "short" | null;
  recentPrices: number[];
};

export function useTechnicalSignals(
  assets: PricePoint[][],
  lookback = 30
): AssetSignal[] {
  return useMemo(() => {
    return assets.map((stockData) => {
      if (!stockData || stockData.length === 0) {
        return {
          symbol: "UNKNOWN",
          rsi: NaN,
          bbUpper: NaN,
          bbMiddle: NaN,
          bbLower: NaN,
          latestPrice: NaN,
          rsiSignal: null,
          bbSignal: null,
          recentPrices: [],
        } as AssetSignal;
      }

      // Extract price series
      const prices = stockData.map((d) => d.price);
      const recentPrices =
        prices.length > lookback ? prices.slice(-lookback) : [...prices];

      // Get latest candle
      const latest = stockData[stockData.length - 1];
      const latestPrice = latest.price;
      const symbol = latest.symbol;

      // RSI 14
      const rsiValues = rsi(prices, 14);
      const latestRsi = rsiValues[rsiValues.length - 1];

      // Bollinger Bands (20 period)
      const bb = bollingerBands(prices, 20, 2);
      const latestBB = {
        upper: bb.upper[bb.upper.length - 1],
        middle: bb.middle[bb.middle.length - 1],
        lower: bb.lower[bb.lower.length - 1],
      };

      // Signals
      const rsiSignal: AssetSignal["rsiSignal"] =
        latestRsi < 30 ? "long" : latestRsi > 70 ? "short" : null;

      const bbSignal: AssetSignal["bbSignal"] =
        latestPrice < latestBB.lower
          ? "long"
          : latestPrice > latestBB.upper
          ? "short"
          : null;

      return {
        symbol,
        rsi: latestRsi,
        bbUpper: latestBB.upper,
        bbMiddle: latestBB.middle,
        bbLower: latestBB.lower,
        latestPrice,
        rsiSignal,
        bbSignal,
        recentPrices,
      } as AssetSignal;
    });
  }, [assets, lookback]);
}
