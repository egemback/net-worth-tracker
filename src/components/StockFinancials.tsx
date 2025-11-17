"use client";

import { useEffect, useState } from "react";
import { getIncomeStatements } from "@/lib/stocks";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function StockFinancials({ stock }: { stock: any }) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    getIncomeStatements(stock.symbol).then(setData);
  }, [stock]);

  if (!data.length) return null;

  const chartData = data.map((x) => ({
    date: x.calendarYear,
    revenue: x.revenue / 1e9,
    netIncome: x.netIncome / 1e9,
  }));

  return (
    <div className="rounded-lg border p-4 bg-white shadow-sm">
      <h2 className="text-lg font-medium mb-2">
        Revenue and Net Income (Billion USD)
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
          <Bar dataKey="netIncome" fill="#10b981" name="Net Income" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
