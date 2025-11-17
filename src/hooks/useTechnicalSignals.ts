import { useMemo } from "react";
import { rsi, bollingerBands } from "@/utils/marketIndicators"; // your functions

type AssetSignal = {
  symbol: string;
  rsi: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  latestPrice: number;
  rsiSignal: "long" | "short" | null;
  bbSignal: "long" | "short" | null;
};

export function useTechnicalSignals(
  assets: { symbol: string; prices?: number[] }[]
): AssetSignal[] {
  const signals = useMemo(() => {
    return assets.map((asset) => {
      const prices = asset.prices ?? [];
      if (prices.length === 0) {
        return {
          symbol: asset.symbol,
          rsi: NaN,
          bbUpper: NaN,
          bbMiddle: NaN,
          bbLower: NaN,
          latestPrice: NaN,
          rsiSignal: null,
          bbSignal: null,
        } as AssetSignal;
      }

      const rsiValues = rsi(prices, 14); // last 14 periods
      const latestRsi = rsiValues[rsiValues.length - 1];

      const bb = bollingerBands(prices, 20, 2); // period 20, 2 std dev
      const latestBB = {
        upper: bb.upper[bb.upper.length - 1],
        middle: bb.middle[bb.middle.length - 1],
        lower: bb.lower[bb.lower.length - 1],
      };

      const latestPrice = prices[prices.length - 1];

      const rsiSignal: AssetSignal["rsiSignal"] =
        latestRsi < 30 ? "long" : latestRsi > 70 ? "short" : null;

      const bbSignal: AssetSignal["bbSignal"] =
        latestPrice < latestBB.lower
          ? "long"
          : latestPrice > latestBB.upper
          ? "short"
          : null;

      return {
        symbol: asset.symbol,
        rsi: latestRsi,
        bbUpper: latestBB.upper,
        bbMiddle: latestBB.middle,
        bbLower: latestBB.lower,
        latestPrice,
        rsiSignal,
        bbSignal,
      } as AssetSignal;
    });
  }, [assets]);

  return signals;
}
