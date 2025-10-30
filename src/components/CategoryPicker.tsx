"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  name: string;
  categories: string[];
  placeholder?: string;
  className?: string;
};

export default function CategoryPicker({
  name,
  categories,
  placeholder = "Category",
  className = "",
}: Props) {
  return (
    // categories are allowed to be Stocks, Bonds, Real Estate, etc.
    <select
      name={name}
      className={`rounded border border-gray-300 p-2 ${className}`}
    >
      <option value="">{placeholder}</option>
      {categories.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );

  const unique = useMemo(
    () =>
      Array.from(new Set(categories.filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [categories]
  );
  const [mode, setMode] = useState<"select" | "custom">("select");
  const [selected, setSelected] = useState<string>(unique[0] || "");
  const [custom, setCustom] = useState("");

  useEffect(() => {
    if (!unique.includes(selected) && unique.length) setSelected(unique[0]);
  }, [unique]);

  return (
    <div className="flex gap-2 items-center">
      {mode === "select" ? (
        <select
          className={`rounded border border-gray-300 p-2 ${className}`}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {unique.length === 0 ? (
            <option value="">No categories yet</option>
          ) : null}
          {unique.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      ) : (
        <input
          className={`rounded border border-gray-300 p-2 ${className}`}
          placeholder={placeholder}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
        />
      )}
      <button
        type="button"
        className="text-xs underline text-gray-600"
        onClick={() => setMode((m) => (m === "select" ? "custom" : "select"))}
      >
        {mode === "select" ? "Custom" : "Select"}
      </button>
      <input
        type="hidden"
        name={name}
        value={
          mode === "select"
            ? selected === "__custom__"
              ? ""
              : selected
            : custom
        }
      />
    </div>
  );
}
