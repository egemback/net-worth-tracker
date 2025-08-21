import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import InfiniteTable from "@/components/InfiniteTable";
import EditableCell from "@/components/EditableCell";
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

  const where: any = {
    AND: [
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
      "createdAt",
      "updatedAt",
    ]);
    return allowed.has(sort) ? { [sort]: order } : { createdAt: "desc" };
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
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
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
    await prisma.liability.create({
      data: {
        name,
        category,
        balance,
        interestRate,
        monthlyPayment,
        termMonths,
      } as any,
    });
    revalidatePath("/liabilities");
  }

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

  async function importCsv(formData: FormData) {
    "use server";
    const file = formData.get("file") as File | null;
    if (!file) return;
    const text = await file.text();
    // header: name,category,balance,interestRate,monthlyPayment,termMonths
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
      await prisma.liability.create({
        data: {
          name,
          category: category || "",
          balance: Number(balance || 0),
          interestRate: interestRate ? Number(interestRate) : null,
          monthlyPayment: monthlyPayment ? Number(monthlyPayment) : null,
          termMonths: termMonths ? Number(termMonths) : null,
        } as any,
      });
    }
    revalidatePath("/liabilities");
  }

  return (
    <main className="space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        {/* Category options handled by CategoryPicker */}
        <h2 className="text-lg font-medium mb-4">Add Liability</h2>
        <form action={create} className="grid grid-cols-1 gap-3 sm:grid-cols-6">
          <input
            name="name"
            placeholder="Name"
            className="rounded border border-gray-300 p-2 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <CategoryPicker
            name="category"
            categories={(
              await prisma.liability.findMany({
                select: { category: true },
                distinct: ["category"],
              })
            ).map((x) => x.category)}
            placeholder="Category"
            className="w-full"
          />
          <input
            name="balance"
            type="number"
            step="0.01"
            placeholder="Balance"
            className="rounded border border-gray-300 p-2 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            name="interestRate"
            type="number"
            step="0.01"
            placeholder="APR %"
            className="rounded border border-gray-300 p-2 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="monthlyPayment"
            type="number"
            step="0.01"
            placeholder="Monthly -"
            className="rounded border border-gray-300 p-2 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="termMonths"
            type="number"
            placeholder="Term (months)"
            className="rounded border border-gray-300 p-2 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Add
          </button>
        </form>
        <form action={importCsv} className="mt-4 flex items-center gap-2">
          <input type="file" name="file" accept=".csv" className="text-sm" />
          <button className="rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-50">
            Import CSV
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium mb-4 text-gray-900">Liabilities</h2>
        <form
          className="mb-3 grid grid-cols-1 sm:grid-cols-8 gap-2"
          method="get"
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name or category"
            className="rounded border border-gray-300 p-2 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="min"
            defaultValue={minBal ?? ""}
            placeholder="Min balance"
            className="rounded border border-gray-300 p-2 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="max"
            defaultValue={maxBal ?? ""}
            placeholder="Max balance"
            className="rounded border border-gray-300 p-2 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-50">
            Apply
          </button>
          <a
            href="/liabilities"
            className="rounded border border-gray-300 px-3 py-1.5 text-center hover:bg-gray-50"
          >
            Clear
          </a>
        </form>
        <form className="mb-3 flex flex-wrap items-center gap-3" method="get">
          {q ? <input type="hidden" name="q" value={q} /> : null}
          {typeof minBal === "number" && !Number.isNaN(minBal) ? (
            <input type="hidden" name="min" value={String(minBal)} />
          ) : null}
          {typeof maxBal === "number" && !Number.isNaN(maxBal) ? (
            <input type="hidden" name="max" value={String(maxBal)} />
          ) : null}
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="order" value={order} />
          <input type="hidden" name="pageSize" value={String(pageSize)} />
          <span className="text-sm text-gray-600">Columns:</span>
          {[
            { key: "name", label: "Name" },
            { key: "category", label: "Category" },
            { key: "balance", label: "Balance" },
            { key: "interestRate", label: "APR %" },
            { key: "monthlyPayment", label: "Monthly -" },
            { key: "termMonths", label: "Term" },
          ].map((c) => (
            <label key={c.key} className="text-sm flex items-center gap-1">
              <input
                type="checkbox"
                name="cols"
                value={c.key}
                defaultChecked={
                  new Set(
                    Array.isArray(colsParam)
                      ? colsParam
                      : typeof colsParam === "string"
                      ? colsParam.split(",")
                      : []
                  ).size
                    ? new Set(
                        Array.isArray(colsParam)
                          ? colsParam
                          : typeof colsParam === "string"
                          ? colsParam.split(",")
                          : []
                      ).has(c.key)
                    : true
                }
              />
              <span>{c.label}</span>
            </label>
          ))}
          <button className="rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-50">
            Update
          </button>
        </form>
        <InfiniteTable
          initialItems={liabilities}
          hasMore={hasMore}
          nextPage={nextPage}
          query={qp({
            q,
            min:
              typeof minBal === "number" && !Number.isNaN(minBal)
                ? String(minBal)
                : undefined,
            max:
              typeof maxBal === "number" && !Number.isNaN(maxBal)
                ? String(maxBal)
                : undefined,
            sort,
            order,
          })}
          onUpdateField={updateField}
          onRemove={remove}
          visibleCols={visibleCols}
          listPath="/api/liabilities/list"
          pageSize={pageSize}
          header={
            <>
              {visibleCols.has("name") && (
                <th className="p-2">
                  <a
                    href={`?${qp({
                      sort: "name",
                      order: order === "asc" ? "desc" : "asc",
                      page: 1,
                    })}`}
                  >
                    Name
                  </a>
                </th>
              )}
              {visibleCols.has("category") && (
                <th className="p-2">
                  <a
                    href={`?${qp({
                      sort: "category",
                      order: order === "asc" ? "desc" : "asc",
                      page: 1,
                    })}`}
                  >
                    Category
                  </a>
                </th>
              )}
              {visibleCols.has("balance") && (
                <th className="p-2">
                  <a
                    href={`?${qp({
                      sort: "balance",
                      order: order === "asc" ? "desc" : "asc",
                      page: 1,
                    })}`}
                  >
                    Balance
                  </a>
                </th>
              )}
              {visibleCols.has("interestRate") && (
                <th className="p-2">
                  <a
                    href={`?${qp({
                      sort: "interestRate",
                      order: order === "asc" ? "desc" : "asc",
                      page: 1,
                    })}`}
                  >
                    APR %
                  </a>
                </th>
              )}
              {visibleCols.has("monthlyPayment") && (
                <th className="p-2">
                  <a
                    href={`?${qp({
                      sort: "monthlyPayment",
                      order: order === "asc" ? "desc" : "asc",
                      page: 1,
                    })}`}
                  >
                    Monthly -
                  </a>
                </th>
              )}
              {visibleCols.has("termMonths") && (
                <th className="p-2">
                  <a
                    href={`?${qp({
                      sort: "termMonths",
                      order: order === "asc" ? "desc" : "asc",
                      page: 1,
                    })}`}
                  >
                    Term
                  </a>
                </th>
              )}
            </>
          }
        />
      </section>
    </main>
  );
}
