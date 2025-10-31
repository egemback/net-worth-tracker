import { prisma } from "@/lib/prisma";
import { PieChart, LineChart } from "@/components/Charts";
import {
  calculateFinancialMetrics,
  calculateRiskMetrics,
} from "@/utils/financialMetrics";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import PercentageGainSelector from "@/components/PercentageGainSelector";

async function getData(year?: number, month?: number) {
  let snapshot;
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // Get current snapshot
  if (year && month) {
    snapshot = await prisma.snapshot.findUnique({
      where: { year_month: { year, month } },
      include: {
        assets: true,
        liabilities: true,
      },
    });
  } else {
    snapshot = await prisma.snapshot.findFirst({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: {
        assets: true,
        liabilities: true,
      },
    });
  }

  // Get previous snapshots for different periods
  const queryYear = year || currentYear;
  const queryMonth = month || currentMonth;

  const previousMonth = await prisma.snapshot.findFirst({
    where: {
      OR: [
        {
          year: queryMonth === 1 ? queryYear - 1 : queryYear,
          month: queryMonth === 1 ? 12 : queryMonth - 1,
        },
        {
          year: currentYear,
          month: { lt: currentMonth },
        },
      ],
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { assets: true, liabilities: true },
  });

  const threeMonthsAgo = await prisma.snapshot.findFirst({
    where: {
      OR: [
        {
          year: queryMonth <= 3 ? queryYear - 1 : queryYear,
          month: queryMonth <= 3 ? 12 - (3 - queryMonth) : queryMonth - 3,
        },
        {
          year: currentYear,
          month: { lte: Math.max(1, currentMonth - 3) },
        },
      ],
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { assets: true, liabilities: true },
  });

  const sixMonthsAgo = await prisma.snapshot.findFirst({
    where: {
      OR: [
        {
          year: queryMonth <= 6 ? queryYear - 1 : queryYear,
          month: queryMonth <= 6 ? 12 - (6 - queryMonth) : queryMonth - 6,
        },
        {
          year: currentYear,
          month: { lte: Math.max(1, currentMonth - 6) },
        },
      ],
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { assets: true, liabilities: true },
  });

  const twelveMonthsAgo = await prisma.snapshot.findFirst({
    where: {
      OR: [
        { year: queryYear - 1, month: queryMonth },
        { year: currentYear - 1, month: currentMonth },
      ],
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { assets: true, liabilities: true },
  });

  const yearStart = await prisma.snapshot.findFirst({
    where: {
      year: queryYear,
      month: 1,
    },
    include: { assets: true, liabilities: true },
  });

  const assets = snapshot?.assets || [];
  const liabilities = snapshot?.liabilities || [];

  // Calculate net worth for each period
  const currentNetWorth =
    assets.reduce((sum, a) => sum + a.value, 0) -
    liabilities.reduce((sum, l) => sum + l.balance, 0);

  const previousMonthNetWorth = previousMonth
    ? previousMonth.assets.reduce((sum, a) => sum + a.value, 0) -
      previousMonth.liabilities.reduce((sum, l) => sum + l.balance, 0)
    : 0;

  const threeMonthsAgoNetWorth = threeMonthsAgo
    ? threeMonthsAgo.assets.reduce((sum, a) => sum + a.value, 0) -
      threeMonthsAgo.liabilities.reduce((sum, l) => sum + l.balance, 0)
    : 0;

  const sixMonthsAgoNetWorth = sixMonthsAgo
    ? sixMonthsAgo.assets.reduce((sum, a) => sum + a.value, 0) -
      sixMonthsAgo.liabilities.reduce((sum, l) => sum + l.balance, 0)
    : 0;

  const twelveMonthsAgoNetWorth = twelveMonthsAgo
    ? twelveMonthsAgo.assets.reduce((sum, a) => sum + a.value, 0) -
      twelveMonthsAgo.liabilities.reduce((sum, l) => sum + l.balance, 0)
    : 0;

  const yearStartNetWorth = yearStart
    ? yearStart.assets.reduce((sum, a) => sum + a.value, 0) -
      yearStart.liabilities.reduce((sum, l) => sum + l.balance, 0)
    : 0;

  // Calculate gains
  const gainFromLastMonth = currentNetWorth - previousMonthNetWorth;
  const percentageGain1Month = previousMonthNetWorth
    ? gainFromLastMonth / previousMonthNetWorth
    : 0;
  const percentageGain3Months = threeMonthsAgoNetWorth
    ? (currentNetWorth - threeMonthsAgoNetWorth) / threeMonthsAgoNetWorth
    : percentageGain1Month;
  const percentageGain6Months = sixMonthsAgoNetWorth
    ? (currentNetWorth - sixMonthsAgoNetWorth) / sixMonthsAgoNetWorth
    : percentageGain3Months;
  const percentageGain12Months = twelveMonthsAgoNetWorth
    ? (currentNetWorth - twelveMonthsAgoNetWorth) / twelveMonthsAgoNetWorth
    : percentageGain6Months;
  const percentageGainThisYear = yearStartNetWorth
    ? (currentNetWorth - yearStartNetWorth) / yearStartNetWorth
    : percentageGain12Months;

  const financialMetrics = calculateFinancialMetrics(assets, liabilities);
  const riskMetrics = calculateRiskMetrics(assets);

  return {
    ...financialMetrics,
    riskMetrics,
    assets,
    liabilities,
    gainFromLastMonth,
    percentageGain1Month,
    percentageGain3Months,
    percentageGain6Months,
    percentageGain12Months,
    percentageGainThisYear,
  };
}

async function getHistory() {
  const snaps = await prisma.snapshot.findMany({
    orderBy: [{ year: "asc" }, { month: "asc" }],
    include: { assets: true, liabilities: true },
  });
  return snaps.map((s) => ({
    month: `${s.month.toString().padStart(2, "0")}/${s.year
      .toString()
      .slice(-2)}`,
    netWorth:
      Number(s.assets.reduce((sum, a) => sum + Number(a.value), 0)) -
      s.liabilities.reduce((sum, l) => sum + Number(l.balance), 0),
    assets: Number(s.assets.reduce((sum, a) => sum + Number(a.value), 0)),
    liabilities: Number(
      s.liabilities.reduce((sum, l) => sum + Number(l.balance), 0)
    ),
  }));
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const year = typeof sp?.year === "string" ? parseInt(sp.year) : undefined;
  const month = typeof sp?.month === "string" ? parseInt(sp.month) : undefined;

  const {
    netWorth,
    totalAssets,
    totalLiabilities,
    debtToAssetRatio,
    liquidityRatio,
    riskMetrics,
    gainFromLastMonth,
    percentageGain1Month,
    percentageGain3Months,
    percentageGain6Months,
    percentageGain12Months,
    percentageGainThisYear,
  } = await getData(year, month);

  const history = await getHistory();

  return (
    <main className="space-y-6">
      {/* Key Metrics */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Net Worth</div>
          <div className="text-2xl font-semibold">
            {formatCurrency(netWorth)}
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">
            Gain from Last Month (SEK)
          </div>
          <div className="text-2xl font-semibold">
            {formatCurrency(gainFromLastMonth)}
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <PercentageGainSelector
            percentageGainThisYear={percentageGainThisYear}
            percentageGain12Months={percentageGain12Months}
            percentageGain6Months={percentageGain6Months}
            percentageGain3Months={percentageGain3Months}
            percentageGain1Month={percentageGain1Month}
          />
        </div>
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="mb-2 font-medium">Net Worth Trend</h3>
          <LineChart
            data={history}
            xKey="month"
            yKeys={["netWorth", "assets", "liabilities"]}
          />
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="mb-2 font-medium">Asset Allocation</h3>
          <PieChart
            data={Object.entries(riskMetrics.portfolioAllocation).map(
              ([name, value]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                value,
              })
            )}
            nameKey="name"
            valueKey="value"
          />
        </div>
      </section>

      {/* Detailed Metrics */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="mb-4 font-medium">Assets & Liabilities</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Assets</span>
              <span className="font-medium">{formatCurrency(totalAssets)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Liabilities</span>
              <span className="font-medium">
                {formatCurrency(totalLiabilities)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Debt to Asset Ratio</span>
              <span className="font-medium">
                {formatPercentage(debtToAssetRatio)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="mb-4 font-medium">Risk Analysis</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Portfolio Diversification</span>
              <span className="font-medium">
                {formatPercentage(riskMetrics.portfolioDiversification)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Risk Level</span>
              <span className="font-medium">{riskMetrics.riskLevel}/5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Expected Return</span>
              <span className="font-medium">
                {formatPercentage(riskMetrics.expectedAnnualReturn)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="mb-4 font-medium">Emergency Fund</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Budgeted Expenses</span>
              <span className="font-medium"></span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Liquidity Ratio</span>
              <span className="font-medium">
                {formatPercentage(liquidityRatio)}
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
