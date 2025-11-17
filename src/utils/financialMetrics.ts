import { prisma } from "@/lib/prisma";
import { Asset, Liability } from "@prisma/client";

export interface FinancialMetrics {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  debtToAssetRatio: number;
  liquidityRatio: number;
}

export interface RiskMetrics {
  portfolioDiversification: number; // 0-1 score
  riskLevel: number; // 1-5 scale
  expectedAnnualReturn: number;
  portfolioAllocation: {
    stocks: number;
    etf: number;
    bonds: number;
    cash: number;
    realEstate: number;
    other: number;
  };
}

export function calculateFinancialMetrics(
  assets: Asset[],
  liabilities: Liability[]
): FinancialMetrics {
  // Calculate basic totals
  const totalAssets = assets.reduce(
    (sum, asset) => sum + Number(asset.value),
    0
  );
  const totalLiabilities = liabilities.reduce(
    (sum, liability) => sum + Number(liability.balance),
    0
  );
  const netWorth = totalAssets - totalLiabilities;

  // Calculate liquid assets
  const liquidAssets = assets
    .filter((asset) => asset.category === "Cash")
    .reduce((sum, asset) => sum + Number(asset.value), 0);

  // Calculate ratios
  const debtToAssetRatio = totalLiabilities / totalAssets;
  const liquidityRatio = liquidAssets / totalAssets;

  return {
    netWorth,
    totalAssets,
    totalLiabilities,
    debtToAssetRatio,
    liquidityRatio,
  };
}

export function calculateRiskMetrics(assets: Asset[]): RiskMetrics {
  // Calculate portfolio allocation
  const totalValue = assets.reduce(
    (sum, asset) => sum + Number(asset.value),
    0
  );
  const allocations = assets.reduce(
    (acc, asset) => {
      if (asset.category === "Stocks") {
        acc.stocks += Number(asset.value);
      } else if (asset.category === "ETF") {
        acc.etf += Number(asset.value);
      } else if (asset.category === "Bonds") {
        acc.bonds += Number(asset.value);
      } else if (asset.category === "Cash") {
        acc.cash += Number(asset.value);
      } else if (asset.category === "Real Estate") {
        acc.realEstate += Number(asset.value);
      } else {
        acc.other += Number(asset.value);
      }
      return acc;
    },
    {
      stocks: 0,
      etf: 0,
      bonds: 0,
      cash: 0,
      realEstate: 0,
      other: 0,
    }
  );

  // Convert to percentages
  Object.keys(allocations).forEach((key) => {
    allocations[key as keyof typeof allocations] =
      (allocations[key as keyof typeof allocations] / totalValue) * 100;
  });

  // Calculate diversification score (0-1)
  // Higher score means better diversification across asset classes
  const allocationValues = Object.values(allocations);
  const diversification =
    1 -
    Math.sqrt(
      allocationValues.reduce((sum, value) => sum + Math.pow(value / 100, 2), 0)
    );

  // Calculate average risk level
  const avgRiskLevel =
    assets.reduce((sum, asset) => sum + (asset.riskLevel || 3), 0) /
    assets.length;

  // Estimate expected return based on allocation and historical averages
  const expectedReturn =
    allocations.stocks * 0.08 + // 8% historical stock return
    allocations.etf * 0.07 + // 7% historical ETF return
    allocations.bonds * 0.03 + // 3% historical bond return
    allocations.cash * 0.01 + // 1% cash return
    allocations.realEstate * 0.06 + // 6% real estate return
    allocations.other * 0.04; // 4% other investments return

  return {
    portfolioDiversification: diversification,
    riskLevel: Math.round(avgRiskLevel),
    expectedAnnualReturn: expectedReturn / 100,
    portfolioAllocation: allocations,
  };
}

export async function calculateGoalProgress(
  target: number,
  type: string
): Promise<{ progressPercentage: number; currentValue: number }> {
  const snapshot = await prisma.snapshot.findFirst({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: {
      assets: true,
      liabilities: true,
    },
  });

  const assetsValue =
    snapshot?.assets.reduce((sum, asset) => sum + Number(asset.value), 0) || 0;
  const liabilitiesValue =
    snapshot?.liabilities.reduce(
      (sum, liability) => sum + Number(liability.balance),
      0
    ) || 0;
  const netWorth = assetsValue - liabilitiesValue;

  const currentValue =
    type === "saving"
      ? assetsValue
      : type === "debtReduction"
      ? liabilitiesValue
      : netWorth;
  const progressPercentage: number =
    type === "debtReduction"
      ? 1 - currentValue / target
      : currentValue / target;
  return { progressPercentage, currentValue };
}
