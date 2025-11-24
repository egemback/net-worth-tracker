import { prisma } from "@/lib/prisma";
import ScenarioClient from "@/components/ScenarioClient";
import { Suspense } from "react";
import FireCalculator from "@/components/FireCalculator";

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
    <section>
      {/* Desktop / tablet: grid */}
      <div className="hidden sm:grid grid-cols-3 gap-4">
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

      {/* Mobile: stacked */}
      <section className="block sm:hidden">
        <div className="rounded-lg border bg-white p-3 shadow-sm space-y-2">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-gray-600">Assets</span>
            <span className="font-semibold text-lg">
              {totalAssets.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-gray-600">Liabilities</span>
            <span className="font-semibold text-lg">
              {totalLiabilities.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-gray-600">Net Worth</span>
            <span className="font-semibold text-lg">
              {netWorth.toLocaleString()}
            </span>
          </div>
        </div>
      </section>
    </section>
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

      <section>
        <FireCalculator netWorth={baseNetWorth} assets={totalAssets} />
      </section>
    </main>
  );
}
