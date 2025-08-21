import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import InfiniteTable from "@/components/InfiniteTable";
import EditableCell from "@/components/EditableCell";
import CategoryPicker from "@/components/CategoryPicker";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = typeof sp?.q === "string" ? sp.q.trim() : "";
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
      "createdAt",
      "updatedAt",
    ]);
    return allowed.has(sort) ? { [sort]: order } : { createdAt: "desc" };
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
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));
  const hasMore = page * pageSize < total;
  const nextPage = hasMore ? page + 1 : null;

  function qp(
    overrides: Record<string, string | number | undefined | string[]>
  ) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (typeof minVal === "number" && !Number.isNaN(minVal))
      sp.set("min", String(minVal));
    if (typeof maxVal === "number" && !Number.isNaN(maxVal))
      sp.set("max", String(maxVal));
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
      data: { name, category, value, growthRate, monthlyContribution } as any,
    });
    revalidatePath("/assets");
  }

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
    await prisma.asset.update({ where: { id }, data });
    revalidatePath("/assets");
  }

  async function remove(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    await prisma.asset.delete({ where: { id } });
    revalidatePath("/assets");
  }

  async function importCsv(formData: FormData) {
    "use server";
    const file = formData.get("file") as File | null;
    if (!file) return;
    const text = await file.text();
    // Simple CSV parser: header expected: name,category,value,growthRate,monthlyContribution
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
    const [header, ...rows] = lines;
    for (const row of rows) {
      const [name, category, value, growthRate, monthlyContribution] = row
        .split(",")
        .map((s) => s?.trim());
      if (!name) continue;
      await prisma.asset.create({
        data: {
          name,
          category: category || "",
          value: Number(value || 0),
          growthRate: growthRate ? Number(growthRate) : null,
          monthlyContribution: monthlyContribution
            ? Number(monthlyContribution)
            : null,
        } as any,
      });
    }
    revalidatePath("/assets");
  }

  return (
    <main className="space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        {/* Category options handled by CategoryPicker */}
        <h2 className="text-lg font-medium mb-2 text-gray-900">Add Asset</h2>
        <p className="text-xs text-gray-600 mb-3">
          Growth is an approximation (annual %); contributions are monthly.
        </p>
        <form action={create} className="grid grid-cols-1 gap-3 sm:grid-cols-6">
          <input
            name="name"
            placeholder="Name"
            className="rounded border border-gray-300 p-2 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <CategoryPicker
            name="category"
            categories={(
              await prisma.asset.findMany({
                select: { category: true },
                distinct: ["category"],
              })
            ).map((x) => x.category)}
            placeholder="Category"
            className="w-full"
          />
          <input
            name="value"
            type="number"
            step="0.01"
            placeholder="Value"
            className="rounded border border-gray-300 p-2 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            name="growthRate"
            type="number"
            step="0.01"
            placeholder="Growth %/yr"
            className="rounded border border-gray-300 p-2 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="monthlyContribution"
            type="number"
            step="0.01"
            placeholder="Monthly +"
            className="rounded border border-gray-300 p-2 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <h2 className="text-lg font-medium mb-4 text-gray-900">Assets</h2>
        <form
          className="mb-3 grid grid-cols-1 sm:grid-cols-8 gap-2"
          method="get"
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name or category"
            className="rounded border border-gray-300 p-2 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="min"
            defaultValue={minVal ?? ""}
            placeholder="Min value"
            className="rounded border border-gray-300 p-2 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="max"
            defaultValue={maxVal ?? ""}
            placeholder="Max value"
            className="rounded border border-gray-300 p-2 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-50">
            Apply
          </button>
          <a
            href="/assets"
            className="rounded border border-gray-300 px-3 py-1.5 text-center hover:bg-gray-50"
          >
            Clear
          </a>
        </form>
        <form className="mb-3 flex flex-wrap items-center gap-3" method="get">
          {/* keep current filters via hidden fields */}
          {q ? <input type="hidden" name="q" value={q} /> : null}
          {typeof minVal === "number" && !Number.isNaN(minVal) ? (
            <input type="hidden" name="min" value={String(minVal)} />
          ) : null}
          {typeof maxVal === "number" && !Number.isNaN(maxVal) ? (
            <input type="hidden" name="max" value={String(maxVal)} />
          ) : null}
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="order" value={order} />
          <input type="hidden" name="pageSize" value={String(pageSize)} />
          <span className="text-sm text-gray-600">Columns:</span>
          {[
            { key: "name", label: "Name" },
            { key: "category", label: "Category" },
            { key: "value", label: "Value" },
            { key: "growthRate", label: "Growth %" },
            { key: "monthlyContribution", label: "Monthly +" },
          ].map((c) => (
            <label key={c.key} className="text-sm flex items-center gap-1">
              <input
                type="checkbox"
                name="cols"
                value={c.key}
                defaultChecked={visibleCols.has(c.key)}
              />
              {c.label}
            </label>
          ))}
          <button className="rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-50">
            Update
          </button>
        </form>
        <InfiniteTable
          initialItems={assets}
          hasMore={hasMore}
          nextPage={nextPage}
          query={qp({
            q,
            min:
              typeof minVal === "number" && !Number.isNaN(minVal)
                ? String(minVal)
                : undefined,
            max:
              typeof maxVal === "number" && !Number.isNaN(maxVal)
                ? String(maxVal)
                : undefined,
            sort,
            order,
          })}
          onUpdateField={updateField}
          onRemove={remove}
          visibleCols={visibleCols}
          listPath="/api/assets/list"
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
              {visibleCols.has("value") && (
                <th className="p-2">
                  <a
                    href={`?${qp({
                      sort: "value",
                      order: order === "asc" ? "desc" : "asc",
                      page: 1,
                    })}`}
                  >
                    Value
                  </a>
                </th>
              )}
              {visibleCols.has("growthRate") && (
                <th className="p-2">
                  <a
                    href={`?${qp({
                      sort: "growthRate",
                      order: order === "asc" ? "desc" : "asc",
                      page: 1,
                    })}`}
                  >
                    Growth %
                  </a>
                </th>
              )}
              {visibleCols.has("monthlyContribution") && (
                <th className="p-2">
                  <a
                    href={`?${qp({
                      sort: "monthlyContribution",
                      order: order === "asc" ? "desc" : "asc",
                      page: 1,
                    })}`}
                  >
                    Monthly +
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
