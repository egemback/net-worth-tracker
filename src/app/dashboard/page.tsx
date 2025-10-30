import { prisma } from "@/lib/prisma";
import { PieChart, LineChart } from "@/components/Charts";
import {
  calculateFinancialMetrics,
  calculateRiskMetrics,
} from "@/utils/financialMetrics";
import { formatCurrency, formatPercentage } from "@/utils/formatters";

async function getData(year?: number, month?: number) {
  let snapshot;

  if (year && month) {
    // Get snapshot data for specific month
    snapshot = await prisma.snapshot.findUnique({
      where: { year_month: { year, month } },
      include: {
        assets: true,
        liabilities: true,
        income: true,
        expenses: true,
      },
    });
  } else {
    // Get latest snapshot data
    snapshot = await prisma.snapshot.findFirst({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: {
        assets: true,
        liabilities: true,
        income: true,
        expenses: true,
      },
    });
  }

  const assets = snapshot?.assets || [];
  const liabilities = snapshot?.liabilities || [];
  const income = snapshot?.income || [];
  const expenses = snapshot?.expenses || [];

  const financialMetrics = calculateFinancialMetrics(
    assets,
    liabilities,
    income,
    expenses
  );
  const riskMetrics = calculateRiskMetrics(assets);

  return {
    ...financialMetrics,
    riskMetrics,
    assets,
    liabilities,
    income,
    expenses,
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
    monthlyNetCashFlow,
    savingsRate,
    liquidityRatio,
    monthlyExpenses,
    emergencyFundRatio,
    riskMetrics,
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
          <div className="text-sm text-gray-500">Monthly Cash Flow</div>
          <div
            className={`text-2xl font-semibold ${
              monthlyNetCashFlow >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatCurrency(monthlyNetCashFlow)}
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Savings Rate</div>
          <div className="text-2xl font-semibold">
            {formatPercentage(savingsRate)}
          </div>
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
              <span className="text-gray-600">Monthly Expenses</span>
              <span className="font-medium">
                {formatCurrency(monthlyExpenses)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Emergency Fund Ratio</span>
              <span className="font-medium">
                {emergencyFundRatio.toFixed(1)} months
              </span>
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
