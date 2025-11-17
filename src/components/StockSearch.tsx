"use client";

import { useState } from "react";
import { searchStock } from "@/lib/stocks";

export default function StockSearch({
  onSelectStock,
}: {
  onSelectStock: (data: any) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query || query.trim().length === 0) return;
    setLoading(true);
    try {
      const res = await searchStock(query);
      setResults(res ?? []);
    } catch (err) {
      console.error("Stock search failed", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search by company name or ticker..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
          className="w-full rounded border p-2"
        />
        <button
          onClick={handleSearch}
          className="bg-blue-600 text-white rounded px-4 hover:bg-blue-700"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {results.length > 0 && (
        <div className="border rounded-lg divide-y">
          {results.map((stock: any) => (
            <button
              key={stock.symbol ?? stock.ticker ?? stock.id}
              onClick={() => onSelectStock(stock)}
              className="block w-full text-left p-2 hover:bg-gray-100"
            >
              <strong>
                {stock.name ?? stock.companyName ?? stock.shortName}
              </strong>{" "}
              ({stock.symbol ?? stock.ticker})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
