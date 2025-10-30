"use client";

import { formatCurrency } from "@/utils/formatters";
import { Budget, Expense } from "@prisma/client";

interface BudgetCategoryCardProps {
  category: string;
  budget?: Budget & {
    expenses: Expense[];
  };
}

export default function BudgetCategoryCard({
  category,
  budget,
}: BudgetCategoryCardProps) {
  const planned = budget?.planned || 0;
  const actual =
    budget?.expenses.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
  const remaining = planned - actual;
  const progress = planned > 0 ? (actual / planned) * 100 : 0;

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="font-medium">{category}</h3>
        {budget?.notes && (
          <p className="mt-1 text-sm text-gray-500">{budget.notes}</p>
        )}
      </div>

      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full ${
              progress > 100
                ? "bg-red-500"
                : progress > 80
                ? "bg-yellow-500"
                : "bg-green-500"
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-gray-500">Planned</dt>
          <dd className="font-medium">{formatCurrency(planned)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Actual</dt>
          <dd
            className={`font-medium ${
              actual > planned ? "text-red-600" : "text-gray-900"
            }`}
          >
            {formatCurrency(actual)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Remaining</dt>
          <dd
            className={`font-medium ${
              remaining < 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            {formatCurrency(remaining)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
