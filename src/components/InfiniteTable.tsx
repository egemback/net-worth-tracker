"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EditableCell from "@/components/EditableCell";

async function fetchPage(path: string, params: URLSearchParams) {
  const url = `${path}?${params.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load");
  return res.json();
}

export default function InfiniteTable({
  initialItems,
  hasMore: initialHasMore,
  nextPage: initialNextPage,
  query,
  onUpdateField,
  onRemove,
  visibleCols,
  header,
  listPath,
  pageSize,
}: any) {
  const [items, setItems] = useState(initialItems || []);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextPage, setNextPage] = useState(initialNextPage);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const sek = useMemo(
    () =>
      new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK" }),
    []
  );
  const fmtPercent = (n: number | null | undefined) =>
    n == null
      ? ""
      : `${n.toLocaleString("sv-SE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} %`;

  const params = useMemo(() => {
    const sp = new URLSearchParams(query);
    sp.set("pageSize", String(pageSize || 20));
    return sp;
  }, [query, pageSize]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextPage) return;
    const sp = new URLSearchParams(params);
    sp.set("page", String(nextPage));
    const data = await fetchPage(listPath, sp);
    setItems((prev: any[]) => [...prev, ...data.items]);
    setHasMore(data.hasMore);
    setNextPage(data.nextPage);
  }, [hasMore, nextPage, params, listPath]);

  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) loadMore();
      });
    });
    const el = sentinelRef.current;
    if (el) io.observe(el);
    return () => {
      if (el) io.unobserve(el);
      io.disconnect();
    };
  }, [loadMore]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm text-gray-900">
        <thead className="bg-gray-50">
          <tr className="text-gray-700">
            {header}
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row: any) => (
            <tr key={row.id} className="border-t hover:bg-gray-50 align-top">
              {visibleCols.has("name") && (
                <td className="p-2">
                  <EditableCell
                    id={row.id}
                    field="name"
                    value={row.name}
                    action={onUpdateField}
                    placeholder="Name"
                  />
                </td>
              )}
              {visibleCols.has("category") && (
                <td className="p-2">
                  <EditableCell
                    id={row.id}
                    field="category"
                    value={row.category}
                    action={onUpdateField}
                    placeholder="Category"
                  />
                </td>
              )}
              {visibleCols.has("value") && (
                <td className="p-2">
                  <EditableCell
                    id={row.id}
                    field="value"
                    value={Number(row.value)}
                    displayValue={sek.format(Number(row.value) || 0)}
                    action={onUpdateField}
                    type="number"
                    step="0.01"
                    placeholder="0"
                  />
                </td>
              )}
              {visibleCols.has("growthRate") && (
                <td className="p-2">
                  <EditableCell
                    id={row.id}
                    field="growthRate"
                    value={row.growthRate ?? ""}
                    displayValue={fmtPercent(row.growthRate)}
                    action={onUpdateField}
                    type="number"
                    step="0.01"
                    placeholder="%"
                  />
                </td>
              )}
              {visibleCols.has("monthlyContribution") && (
                <td className="p-2">
                  <EditableCell
                    id={row.id}
                    field="monthlyContribution"
                    value={row.monthlyContribution ?? ""}
                    displayValue={
                      row.monthlyContribution == null
                        ? ""
                        : sek.format(Number(row.monthlyContribution) || 0)
                    }
                    action={onUpdateField}
                    type="number"
                    step="0.01"
                    placeholder="0"
                  />
                </td>
              )}
              {visibleCols.has("balance") && (
                <td className="p-2">
                  <EditableCell
                    id={row.id}
                    field="balance"
                    value={Number(row.balance)}
                    displayValue={sek.format(Number(row.balance) || 0)}
                    action={onUpdateField}
                    type="number"
                    step="0.01"
                    placeholder="0"
                  />
                </td>
              )}
              {visibleCols.has("interestRate") && (
                <td className="p-2">
                  <EditableCell
                    id={row.id}
                    field="interestRate"
                    value={row.interestRate ?? ""}
                    displayValue={fmtPercent(row.interestRate)}
                    action={onUpdateField}
                    type="number"
                    step="0.01"
                    placeholder="%"
                  />
                </td>
              )}
              {visibleCols.has("monthlyPayment") && (
                <td className="p-2">
                  <EditableCell
                    id={row.id}
                    field="monthlyPayment"
                    value={row.monthlyPayment ?? ""}
                    displayValue={
                      row.monthlyPayment == null
                        ? ""
                        : sek.format(Number(row.monthlyPayment) || 0)
                    }
                    action={onUpdateField}
                    type="number"
                    step="0.01"
                    placeholder="0"
                  />
                </td>
              )}
              {visibleCols.has("riskLevel") && (
                <td className="p-2">
                  <EditableCell
                    id={row.id}
                    field="riskLevel"
                    value={row.riskLevel ?? ""}
                    action={onUpdateField}
                    type="number"
                    step="1"
                    placeholder="0"
                  />
                </td>
              )}
              {visibleCols.has("termMonths") && (
                <td className="p-2">
                  <EditableCell
                    id={row.id}
                    field="termMonths"
                    value={row.termMonths ?? ""}
                    action={onUpdateField}
                    type="number"
                    step="1"
                    placeholder="0"
                  />
                </td>
              )}
              <td className="p-2">
                <button
                  onClick={async () => {
                    const fd = new FormData();
                    fd.set("id", String(row.id));
                    await onRemove(fd);
                    setItems((prev: any[]) =>
                      prev.filter((r) => r.id !== row.id)
                    );
                    window.dispatchEvent(
                      new CustomEvent("toast", { detail: "Deleted" })
                    );
                  }}
                  className="text-red-600 text-xs underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div ref={sentinelRef} className="h-10" />
    </div>
  );
}
