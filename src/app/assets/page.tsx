import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import InfiniteTable from "@/components/InfiniteTable";
import CategoryPicker from "@/components/CategoryPicker";

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

  const minVal = typeof sp?.min === "string" ? Number(sp.min) : undefined;
  const maxVal = typeof sp?.max === "string" ? Number(sp.max) : undefined;
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
  const colsParam = sp?.cols;
  const colsArray = Array.isArray(colsParam)
    ? colsParam
    : typeof colsParam === "string"
    ? colsParam.split(",")
    : [];
  const visibleCols = new Set(
    colsArray.length
      ? colsArray
      : ["name", "category", "value", "growthRate", "monthlyContribution"]
  );

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
      typeof minVal === "number" && !Number.isNaN(minVal)
        ? { value: { gte: minVal as any } }
        : {},
      typeof maxVal === "number" && !Number.isNaN(maxVal)
        ? { value: { lte: maxVal as any } }
        : {},
    ],
  } as any;

  const orderBy: any = (() => {
    const allowed = new Set([
      "name",
      "category",
      "value",
      "growthRate",
      "monthlyContribution",
    ]);
    return allowed.has(sort) ? { [sort]: order } : { value: "desc" };
  })();

  const total = await prisma.asset.count({ where });

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

  const hasMore = page * pageSize < total;
  const nextPage = hasMore ? page + 1 : null;

  // ✅ CREATE with snapshotId
  async function create(formData: FormData) {
    "use server";
    const name = String(formData.get("name") || "");
    const category = String(formData.get("category") || "");

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

    await prisma.asset.create({
      data: {
        name,
        category,
        value,
        growthRate,
        monthlyContribution,
        snapshotId: snapshot!.id,
      },
    });

    revalidatePath("/assets");
  }

  // ✅ UPDATE within snapshot
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
            categories={await prisma.asset
              .findMany({
                select: { category: true },
                distinct: ["category"],
              })
              .then((res) => res.map((r) => r.category))}
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
        <h2 className="text-lg font-medium mb-4 text-gray-900">
          Assets for {month}/{year}
        </h2>
        <div
          key={`${month}-${year}-${q}-${minVal}-${maxVal}-${sort}-${order}-${pageSize}-${colsArray.join()}`}
        >
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
              </>
            }
          />
        </div>
      </section>
    </main>
  );
}
