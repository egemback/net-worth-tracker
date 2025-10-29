import { prisma } from "@/lib/prisma";
import ScenarioClient from "@/components/ScenarioClient";
import { Suspense } from "react";

async function getCurrentSnapshot({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const year = sp?.year ? Number(sp.year) : new Date().getFullYear();
  const month = sp?.month ? Number(sp.month) : new Date().getMonth() + 1;

  // ensure snapshot for the chosen month/year exists
  let snapshot = await prisma.snapshot.findUnique({
    where: { year_month: { year, month } },
    include: { assets: true, liabilities: true },
  });

  if (!snapshot) {
    // Find or create snapshot for this month
    snapshot = await prisma.snapshot.findFirst({
      where: { month, year },
      include: { assets: true, liabilities: true },
    });
  }

  return snapshot;
}

async function Summary({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const snapshot = await getCurrentSnapshot({ searchParams });
  const assets = snapshot?.assets ?? [];
  const liabilities = snapshot?.liabilities ?? [];

  const totalAssets = assets.reduce((s, a) => s + Number(a.value || 0), 0);
  const totalLiabilities = liabilities.reduce(
    (s, l) => s + Number(l.balance || 0),
    0
  );
  const netWorth = totalAssets - totalLiabilities;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="text-sm text-gray-500">Assets</div>
        <div className="text-2xl font-semibold">
          {totalAssets.toLocaleString()}
        </div>
      </div>
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="text-sm text-gray-500">Liabilities</div>
        <div className="text-2xl font-semibold">
          {totalLiabilities.toLocaleString()}
        </div>
      </div>
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="text-sm text-gray-500">Net Worth</div>
        <div className="text-2xl font-semibold">
          {netWorth.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

export default async function ScenariosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const snapshot = await getCurrentSnapshot({ searchParams });
  const assets = snapshot?.assets ?? [];
  const liabilities = snapshot?.liabilities ?? [];

  const totalAssets = assets.reduce((s, a) => s + Number(a.value || 0), 0);
  const totalLiabilities = liabilities.reduce(
    (s, l) => s + Number(l.balance || 0),
    0
  );
  const baseNetWorth = totalAssets - totalLiabilities;

  return (
    <main className="space-y-6">
      <Suspense>
        <Summary searchParams={searchParams} />
      </Suspense>

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium mb-4">Forecast</h2>
        <ScenarioClient
          baseNetWorth={baseNetWorth}
          assets={assets}
          liabilities={liabilities}
        />
      </section>
    </main>
  );
}
