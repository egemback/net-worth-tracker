import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import InfiniteTable from "@/components/InfiniteTable";
import CategoryPicker from "@/components/CategoryPicker";

export default async function LiabilitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = typeof sp?.q === "string" ? sp.q.trim() : "";
  const minBal = typeof sp?.min === "string" ? Number(sp.min) : undefined;
  const maxBal = typeof sp?.max === "string" ? Number(sp.max) : undefined;
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
      : [
          "name",
          "category",
          "balance",
          "interestRate",
          "monthlyPayment",
          "termMonths",
        ]
  );
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

  // -- Filter & pagination setup
  const where: any = {
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
      typeof minBal === "number" && !Number.isNaN(minBal)
        ? { balance: { gte: minBal as any } }
        : {},
      typeof maxBal === "number" && !Number.isNaN(maxBal)
        ? { balance: { lte: maxBal as any } }
        : {},
    ],
  };

  const orderBy: any = (() => {
    const allowed = new Set([
      "name",
      "category",
      "balance",
      "interestRate",
      "monthlyPayment",
      "termMonths",
    ]);
    return allowed.has(sort) ? { [sort]: order } : { balance: "desc" };
  })();

  const total = await prisma.liability.count({ where });
  const rawLiabilities = await prisma.liability.findMany({
    where,
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  const liabilities = rawLiabilities.map((l) => ({
    ...l,
    balance: Number(l.balance),
    monthlyPayment: l.monthlyPayment === null ? null : Number(l.monthlyPayment),
  }));
  const hasMore = page * pageSize < total;
  const nextPage = hasMore ? page + 1 : null;

  function qp(
    overrides: Record<string, string | number | undefined | string[]>
  ) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (typeof minBal === "number" && !Number.isNaN(minBal))
      sp.set("min", String(minBal));
    if (typeof maxBal === "number" && !Number.isNaN(maxBal))
      sp.set("max", String(maxBal));
    if (sort) sp.set("sort", sort);
    if (order) sp.set("order", order);
    sp.set("pageSize", String(pageSize));
    if (colsArray.length) sp.set("cols", colsArray.join(","));
    Object.entries(overrides).forEach(([k, v]) => {
      if (v === undefined) return;
      if (Array.isArray(v)) sp.set(k, v.join(","));
      else sp.set(k, String(v));
    });
    return sp.toString();
  }

  // ✅ Create liability and attach to snapshot
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

    const maybeNum = (s: FormDataEntryValue | null) => {
      if (s == null || String(s).trim() === "") return null;
      const n = Number(String(s).replace(",", "."));
      return Number.isNaN(n) ? null : n;
    };

    const balance = normalize(formData.get("balance"));
    const interestRate = maybeNum(formData.get("interestRate"));
    const monthlyPayment = maybeNum(formData.get("monthlyPayment"));
    const termMonths =
      formData.get("termMonths") != null &&
      String(formData.get("termMonths")).trim() !== ""
        ? Number(String(formData.get("termMonths")).replace(",", "."))
        : null;

    // Find or create snapshot for this month
    let snapshot = await prisma.snapshot.findUnique({
      where: { year_month: { year, month } },
    });
    if (!snapshot) {
      snapshot = await prisma.snapshot.create({
        data: { year, month, netWorth: 0 },
      });
    }

    await prisma.liability.create({
      data: {
        name,
        category,
        balance,
        interestRate,
        monthlyPayment,
        termMonths,
        snapshotId: snapshot.id,
      },
    });

    revalidatePath("/liabilities");
  }

  // ✅ Update both main liability and snapshot entry
  async function updateField(formData: FormData) {
    "use server";

    const id = Number(formData.get("id"));
    const field = String(formData.get("field"));
    const valueRaw = (formData.get("value") as string | null) ?? null;

    const numeric = new Set([
      "balance",
      "interestRate",
      "monthlyPayment",
      "termMonths",
    ]);
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

    await prisma.liability.update({ where: { id }, data });

    revalidatePath("/liabilities");
  }

  async function remove(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    await prisma.liability.delete({ where: { id } });
    revalidatePath("/liabilities");
  }

  // CSV import (unchanged)
  async function importCsv(formData: FormData) {
    "use server";
    const file = formData.get("file") as File | null;
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
    const [header, ...rows] = lines;
    for (const row of rows) {
      const [
        name,
        category,
        balance,
        interestRate,
        monthlyPayment,
        termMonths,
      ] = row.split(",").map((s) => s?.trim());
      if (!name) continue;
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      let snapshot = await prisma.snapshot.findUnique({
        where: { year_month: { year, month } },
      });
      if (!snapshot) {
        snapshot = await prisma.snapshot.create({
          data: { year, month, netWorth: 0 },
        });
      }
      const liability = await prisma.liability.create({
        data: {
          name,
          category: category || "",
          balance: Number(balance || 0),
          interestRate: interestRate ? Number(interestRate) : null,
          monthlyPayment: monthlyPayment ? Number(monthlyPayment) : null,
          termMonths: termMonths ? Number(termMonths) : null,
          snapshotId: snapshot.id,
        } as any,
      });
      await prisma.liability.create({
        data: {
          snapshotId: snapshot.id,
          liabilityId: liability.id,
          name,
          category,
          balance: Number(balance || 0),
          interestRate: interestRate ? Number(interestRate) : null,
          monthlyPayment: monthlyPayment ? Number(monthlyPayment) : null,
          termMonths: termMonths ? Number(termMonths) : null,
        },
      });
    }
    revalidatePath("/liabilities");
  }

  // --- Page Rendering ---
  return (
    <main className="space-y-8">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium mb-4 text-gray-900">
          Add Liability for {month}/{year}
        </h2>
        <form action={create} className="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <input name="name" placeholder="Name" className="input" required />
          <CategoryPicker
            name="category"
            categories={await prisma.liability
              .findMany({
                select: { category: true },
                distinct: ["category"],
              })
              .then((res) => res.map((r) => r.category))}
            placeholder="Category"
            className="w-full"
          />
          <input
            name="balance"
            type="number"
            step="0.01"
            placeholder="Balance"
            className="input"
            required
          />
          <input
            name="interestRate"
            type="number"
            step="0.01"
            placeholder="APR %"
            className="input"
          />
          <input
            name="monthlyPayment"
            type="number"
            step="0.01"
            placeholder="Monthly -"
            className="input"
          />
          <input
            name="termMonths"
            type="number"
            placeholder="Term (months)"
            className="input"
          />
          <button className="rounded border px-4 py-2">Add</button>
        </form>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium mb-4 text-gray-900">
          Liabilities for {month}/{year}
        </h2>
        <div
          key={`${month}-${year}-${q}-${sort}-${order}-${pageSize}-${colsArray.join()}`}
        >
          <InfiniteTable
            initialItems={liabilities}
            hasMore={hasMore}
            nextPage={nextPage}
            query={`month=${month}&year=${year}`}
            onUpdateField={updateField}
            onRemove={remove}
            visibleCols={visibleCols}
            listPath="/api/liabilities/list"
            header={
              <>
                {visibleCols.has("name") && <th className="p-2">Name</th>}
                {visibleCols.has("category") && (
                  <th className="p-2">Category</th>
                )}
                {visibleCols.has("balance") && <th className="p-2">Balance</th>}
                {visibleCols.has("interestRate") && (
                  <th className="p-2">APR %</th>
                )}
                {visibleCols.has("monthlyPayment") && (
                  <th className="p-2">Monthly Payment</th>
                )}
                {visibleCols.has("termMonths") && (
                  <th className="p-2">Term (months)</th>
                )}
              </>
            }
          />
        </div>
      </section>
    </main>
  );
}
