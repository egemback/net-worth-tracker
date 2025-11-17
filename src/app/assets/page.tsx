import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import InfiniteTable from "@/components/InfiniteTable";
import CategoryPicker from "@/components/CategoryPicker";

// Risk levels for "Stocks", "ETF", "Bonds", "Real Estate", "Cash", "Other"
const RISK_LEVELS = {
  Stocks: 4,
  ETF: 3,
  Bonds: 2,
  "Real Estate": 3,
  Cash: 1,
  Other: 5,
};

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = typeof sp?.q === "string" ? sp.q.trim() : "";
  const year = sp?.year ? Number(sp.year) : new Date().getFullYear();
  const month = sp?.month ? Number(sp.month) : new Date().getMonth() + 1;

  // ensure snapshot for the chosen month/year exists
  let snapshot = await prisma.snapshot.findUnique({
    where: { year_month: { year, month } },
  });

  if (!snapshot) {
    snapshot = await prisma.snapshot.create({
      data: { year, month, netWorth: 0 },
    });
  }

  const sort = typeof sp?.sort === "string" ? sp.sort : "createdAt";
  const order =
    typeof sp?.order === "string" && (sp.order === "asc" || sp.order === "desc")
      ? (sp.order as "asc" | "desc")
      : "desc";
  const page =
    typeof sp?.page === "string"
      ? Math.max(1, parseInt(sp.page as string, 10) || 1)
      : 1;
  const pageSize =
    typeof sp?.pageSize === "string"
      ? Math.min(100, Math.max(5, parseInt(sp.pageSize as string, 10) || 20))
      : 20;
  const visibleCols = new Set([
    "name",
    "category",
    "value",
    "growthRate",
    "monthlyContribution",
  ]);

  const where = {
    AND: [
      { snapshotId: snapshot.id },
      q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };

  const orderBy = (() => {
    const allowed = new Set([
      "name",
      "category",
      "value",
      "growthRate",
      "monthlyContribution",
    ]);
    return allowed.has(sort) ? { [sort]: order } : { value: "desc" };
  })() as { [key: string]: "asc" | "desc" };

  const rawAssets = await prisma.asset.findMany({
    where,
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  const assets = rawAssets.map((a) => ({
    ...a,
    value: Number(a.value),
    monthlyContribution:
      a.monthlyContribution === null ? null : Number(a.monthlyContribution),
  }));
  const tableHash = assets.reduce(
    (acc, a) =>
      acc +
      a.id +
      Number(a.value) +
      Number(a.monthlyContribution || 0) +
      Number(a.growthRate || 0) +
      a.name.length +
      a.category.length,
    0
  );

  const hasMore = page * pageSize < assets.length;
  const nextPage = hasMore ? page + 1 : null;

  // CREATE with snapshotId
  async function create(formData: FormData) {
    "use server";
    const name = String(formData.get("name") || "");
    const category = String(formData.get("category") || "Other");

    const normalize = (s: FormDataEntryValue | null) => {
      if (s == null) return 0;
      const str = String(s).replace(",", ".");
      const n = Number(str);
      return Number.isNaN(n) ? 0 : n;
    };
    const value = normalize(formData.get("value"));
    const growthRate =
      formData.get("growthRate") != null &&
      String(formData.get("growthRate")).trim() !== ""
        ? Number(String(formData.get("growthRate")).replace(",", "."))
        : null;
    const monthlyContribution =
      formData.get("monthlyContribution") != null &&
      String(formData.get("monthlyContribution")).trim() !== ""
        ? Number(String(formData.get("monthlyContribution")).replace(",", "."))
        : null;

    const riskLevel =
      RISK_LEVELS[category as keyof typeof RISK_LEVELS] || RISK_LEVELS.Other;

    await prisma.asset.create({
      data: {
        name,
        category,
        value,
        growthRate,
        monthlyContribution,
        riskLevel: riskLevel,
        snapshotId: snapshot!.id,
      },
    });

    revalidatePath("/assets");
  }

  // UPDATE within snapshot
  async function updateField(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    const field = String(formData.get("field"));
    const valueRaw = (formData.get("value") as string | null) ?? null;
    const numeric = new Set(["value", "growthRate", "monthlyContribution"]);
    const data: any = {};

    if (numeric.has(field)) {
      if (valueRaw === null || valueRaw === "") {
        data[field] = null;
      } else {
        const n = Number(String(valueRaw).replace(",", "."));
        data[field] = Number.isNaN(n) ? null : n;
      }
    } else {
      data[field] = valueRaw;
    }

    await prisma.asset.update({
      where: { id },
      data,
    });

    revalidatePath("/assets");
  }

  async function remove(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    await prisma.asset.delete({ where: { id } });
    revalidatePath("/assets");
  }

  // COPY FROM LAST MONTH
  async function copyFromLastMonth() {
    "use server";
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }

    const prevSnapshot = await prisma.snapshot.findUnique({
      where: { year_month: { year: prevYear, month: prevMonth } },
      include: { assets: true },
    });

    if (!prevSnapshot) return;

    const existingAssets = await prisma.asset.findMany({
      where: { snapshotId: snapshot!.id },
      select: { name: true },
    });
    const existingNames = new Set(existingAssets.map((a) => a.name));

    const newAssets = prevSnapshot.assets.filter(
      (a) => !existingNames.has(a.name)
    );

    if (newAssets.length > 0) {
      await prisma.asset.createMany({
        data: newAssets.map((a) => ({
          name: a.name,
          category: a.category,
          value: a.value,
          growthRate: a.growthRate,
          monthlyContribution: a.monthlyContribution,
          snapshotId: snapshot!.id,
        })),
      });
    }

    revalidatePath("/assets");
  }

  return (
    <main className="space-y-8">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium mb-4 text-gray-900">
          Add Asset for {month}/{year}
        </h2>
        <form action={create} className="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <input name="name" placeholder="Name" className="input" required />
          <CategoryPicker
            name="category"
            categories={[
              "Stocks",
              "ETF",
              "Bonds",
              "Real Estate",
              "Cash",
              "Other",
            ]}
            /*categories={await prisma.asset
              .findMany({
                select: { category: true },
                distinct: ["category"],
              })
              .then((res) => res.map((r) => r.category))}*/
            placeholder="Category"
            className="w-full"
          />
          <input
            name="value"
            type="number"
            step="0.01"
            placeholder="Value"
            className="input"
            required
          />
          <input
            name="growthRate"
            type="number"
            step="0.01"
            placeholder="Growth %/yr"
            className="input"
          />
          <input
            name="monthlyContribution"
            type="number"
            step="0.01"
            placeholder="Monthly +"
            className="input"
          />
          <button className="rounded border px-4 py-2">Add</button>
        </form>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium mb-4 text-gray-900">
            Assets for {month}/{year}
          </h2>
          <form action={copyFromLastMonth}>
            <button type="submit" className="rounded border px-4 py-2">
              Copy from Last Month
            </button>
          </form>
        </div>
        <div key={`${tableHash}`}>
          <InfiniteTable
            initialItems={assets}
            hasMore={hasMore}
            nextPage={nextPage}
            query={`month=${month}&year=${year}`}
            onUpdateField={updateField}
            onRemove={remove}
            visibleCols={visibleCols}
            listPath="/api/assets/list"
            header={
              <>
                {visibleCols.has("name") && <th className="p-2">Name</th>}
                {visibleCols.has("category") && (
                  <th className="p-2">Category</th>
                )}
                {visibleCols.has("value") && <th className="p-2">Balance</th>}
                {visibleCols.has("growthRate") && (
                  <th className="p-2">Growth %/yr</th>
                )}
                {visibleCols.has("monthlyContribution") && (
                  <th className="p-2">Monthly +</th>
                )}
                {visibleCols.has("riskLevel") && (
                  <th className="p-2">Risk Level +</th>
                )}
              </>
            }
          />
        </div>
      </section>
    </main>
  );
}
