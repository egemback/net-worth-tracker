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
    "balance",
    "interestRate",
    "monthlyPayment",
    "termMonths",
  ]);
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
  const tableHash = liabilities.reduce(
    (lcc, l) =>
      lcc +
      l.id +
      Number(l.balance) +
      Number(l.monthlyPayment || 0) +
      Number(l.interestRate || 0) +
      Number(l.termMonths || 0) +
      l.name.length +
      l.category.length,
    0
  );

  const hasMore = page * pageSize < liabilities.length;
  const nextPage = hasMore ? page + 1 : null;

  // Create liability and attach to snapshot
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

  // Update both main liability and snapshot entry
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
      include: { liabilities: true },
    });

    if (!prevSnapshot) return;

    const existingLiabilities = await prisma.asset.findMany({
      where: { snapshotId: snapshot!.id },
      select: { name: true },
    });
    const existingNames = new Set(existingLiabilities.map((a) => a.name));

    const newLiabilities = prevSnapshot.liabilities.filter(
      (a) => !existingNames.has(a.name)
    );

    if (newLiabilities.length > 0) {
      await prisma.liability.createMany({
        data: newLiabilities.map((l) => ({
          name: l.name,
          category: l.category,
          balance: l.balance,
          interestRate: l.interestRate,
          monthlyPayment: l.monthlyPayment,
          termMonths: l.termMonths,
          snapshotId: snapshot!.id,
        })),
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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium mb-4 text-gray-900">
            Liabilities for {month}/{year}
          </h2>
          <form action={copyFromLastMonth}>
            <button type="submit" className="rounded border px-4 py-2">
              Copy from Last Month
            </button>
          </form>
        </div>
        <div key={`${tableHash}`}>
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
