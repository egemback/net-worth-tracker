import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PieChart, LineChart } from "@/components/Charts";

async function getData() {
  const [assets, liabilities] = await Promise.all([
    prisma.asset.findMany(),
    prisma.liability.findMany(),
  ]);
  const totalAssets = assets.reduce((s, a) => s + Number(a.value), 0);
  const totalLiabilities = liabilities.reduce(
    (s, l) => s + Number(l.balance),
    0
  );
  const netWorth = totalAssets - totalLiabilities;
  return { totalAssets, totalLiabilities, netWorth };
}

async function getHistory() {
  const snaps = await prisma.snapshot.findMany({ orderBy: { date: "asc" } });
  return snaps.map((s) => ({
    month: new Date(s.date).toLocaleDateString(undefined, {
      year: "2-digit",
      month: "short",
    }),
    netWorth: Number(s.netWorth),
  }));
}

export default async function Home() {
  const { totalAssets, totalLiabilities, netWorth } = await getData();
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
        <form action={"/api/snapshots/create"} method="post">
          <button className="rounded border px-4 py-2">Create Snapshot</button>
        </form>
        <a href="/api/snapshots/export" className="rounded border px-4 py-2">
          Export Snapshots (CSV)
        </a>
      </section>
    </main>
  );
}
