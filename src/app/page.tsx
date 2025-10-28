import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PieChart, LineChart } from "@/components/Charts";

async function getData(year?: number, month?: number) {
  let assets: any[], liabilities: any[];

  if (year && month) {
    // Get snapshot data for specific month
    const snapshot = await prisma.snapshot.findUnique({
      where: { year_month: { year, month } },
      include: { assets: true, liabilities: true },
    });

    if (snapshot) {
      assets = snapshot.assets;
      liabilities = snapshot.liabilities;
    } else {
      // No snapshot exists for this month
      assets = [];
      liabilities = [];
    }
  } else {
    // Get latest snapshot data
    const snapshot = await prisma.snapshot.findFirst({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: { assets: true, liabilities: true },
    });

    if (snapshot) {
      assets = snapshot.assets;
      liabilities = snapshot.liabilities;
    } else {
      // No snapshots exist at all
      assets = [];
      liabilities = [];
    }
  }

  const totalAssets = assets.reduce((s, a) => s + Number(a.value), 0);
  const totalLiabilities = liabilities.reduce(
    (s, l) => s + Number(l.balance),
    0
  );
  const netWorth = totalAssets - totalLiabilities;
  return { totalAssets, totalLiabilities, netWorth };
}

async function getHistory() {
  const snaps = await prisma.snapshot.findMany({
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });
  return snaps.map((s) => ({
    month: `${s.month.toString().padStart(2, "0")}/${s.year
      .toString()
      .slice(-2)}`,
    netWorth: Number(s.netWorth),
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

  const { totalAssets, totalLiabilities, netWorth } = await getData(
    year,
    month
  );
  const history = await getHistory();
  const composition = [
    { name: "Assets", value: totalAssets },
    { name: "Liabilities", value: totalLiabilities },
  ];

  return (
    <main className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Total Assets</div>
          <div className="text-2xl font-semibold">
            {totalAssets.toLocaleString()} SEK
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Total Liabilities</div>
          <div className="text-2xl font-semibold">
            {totalLiabilities.toLocaleString()} SEK
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Net Worth</div>
          <div className="text-2xl font-semibold">
            {netWorth.toLocaleString()} SEK
          </div>
        </div>
      </section>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="mb-2 font-medium">Net Worth (last 12 months)</h3>
          <LineChart data={history} xKey="month" yKey="netWorth" />
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h3 className="mb-2 font-medium">Composition</h3>
          <PieChart data={composition} nameKey="name" valueKey="value" />
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        <Link
          href="/assets"
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          Manage Assets
        </Link>
        <Link
          href="/liabilities"
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          Manage Liabilities
        </Link>
        <Link
          href="/scenarios"
          className="rounded bg-indigo-600 px-4 py-2 text-white"
        >
          Forecast & Scenarios
        </Link>
        <a href="/api/snapshots/export" className="rounded border px-4 py-2">
          Export Snapshots (CSV)
        </a>
      </section>
    </main>
  );
}
