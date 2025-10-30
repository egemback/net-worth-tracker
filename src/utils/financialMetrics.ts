import { Asset, Liability, Income, Expense } from "@prisma/client";

export interface FinancialMetrics {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  debtToAssetRatio: number;
  debtToIncomeRatio: number;
  savingsRate: number;
  monthlyNetCashFlow: number;
  liquidityRatio: number;
  monthlyExpenses: number;
  emergencyFundRatio: number; // months of expenses covered by liquid assets
}

export interface RiskMetrics {
  portfolioDiversification: number; // 0-1 score
  riskLevel: number; // 1-5 scale
  expectedAnnualReturn: number;
  portfolioAllocation: {
    stocks: number;
    bonds: number;
    cash: number;
    realEstate: number;
    other: number;
  };
}

export function calculateFinancialMetrics(
  assets: Asset[],
  liabilities: Liability[],
  income: Income[],
  expenses: Expense[]
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

  // Calculate monthly income and expenses
  const monthlyIncome = income
    .filter((inc) => inc.isRecurring)
    .reduce((sum, inc) => {
      const amount = Number(inc.amount);
      switch (inc.frequency) {
        case "annual":
          return sum + amount / 12;
        case "quarterly":
          return sum + amount / 3;
        default:
          return sum + amount; // monthly
      }
    }, 0);

  const monthlyExpenses = expenses
    .filter((exp) => exp.isRecurring)
    .reduce((sum, exp) => {
      const amount = Number(exp.amount);
      switch (exp.frequency) {
        case "annual":
          return sum + amount / 12;
        case "quarterly":
          return sum + amount / 3;
        default:
          return sum + amount; // monthly
      }
    }, 0);

  // Calculate liquid assets
  const liquidAssets = assets
    .filter((asset) => asset.category === "Cash")
    .reduce((sum, asset) => sum + Number(asset.value), 0);

  // Calculate ratios
  const debtToAssetRatio = totalLiabilities / totalAssets;
  const debtToIncomeRatio = totalLiabilities / (monthlyIncome * 12);
  const savingsRate = (monthlyIncome - monthlyExpenses) / monthlyIncome;
  const monthlyNetCashFlow = monthlyIncome - monthlyExpenses;
  const liquidityRatio = liquidAssets / totalAssets;
  const emergencyFundRatio = liquidAssets / monthlyExpenses; // months of expenses covered

  return {
    netWorth,
    totalAssets,
    totalLiabilities,
    debtToAssetRatio,
    debtToIncomeRatio,
    savingsRate,
    monthlyNetCashFlow,
    liquidityRatio,
    monthlyExpenses,
    emergencyFundRatio,
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

export function calculateGoalProgress(
  currentValue: number,
  target: number,
  startDate: Date,
  deadline: Date
): { progressPercentage: number; onTrack: boolean; projectedCompletion: Date } {
  const progressPercentage = (currentValue / target) * 100;

  const totalDays =
    (deadline.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  const daysPassed =
    (new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  const expectedProgress = (daysPassed / totalDays) * 100;

  const onTrack = progressPercentage >= expectedProgress;

  // Calculate projected completion date based on current progress rate
  const progressPerDay = progressPercentage / daysPassed;
  const daysToCompletion = (100 - progressPercentage) / progressPerDay;
  const projectedCompletion = new Date();
  projectedCompletion.setDate(projectedCompletion.getDate() + daysToCompletion);

  return {
    progressPercentage,
    onTrack,
    projectedCompletion,
  };
}
