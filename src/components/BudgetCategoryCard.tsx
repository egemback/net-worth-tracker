"use client";

import { formatCurrency } from "@/utils/formatters";
import { Budget } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface BudgetCategoryCardProps {
  category: string;
  budget?: Budget;
}

export default function BudgetCategoryCard({
  category,
  budget,
}: BudgetCategoryCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const planned = budget?.planned || 0;
  const initialActual = budget?.actual || 0;
  const actual = budget?.actual || 0;
  const remaining = planned - actual;
  const progress = planned > 0 ? (actual / planned) * 100 : 0;

  const [actualInput, setActualInput] = useState(initialActual.toString());

  const currentActual = parseFloat(actualInput) || 0;

  const updateActual = async () => {
    if (!budget?.id) return; // Cannot update if no budget ID exists

    const newActualValue = parseFloat(actualInput);

    if (isNaN(newActualValue) || newActualValue === initialActual) {
      // If the value is invalid or hasn't changed, just reset input and exit
      setActualInput(initialActual.toString());
      return;
    }

    try {
      const res = await fetch(`/api/budgets/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actual: newActualValue,
          year: budget.year,
          month: budget.month,
          category: budget.category,
        }),
      });

      if (res.ok) {
        // Successful update: refresh the page data without full page reload
        startTransition(() => {
          router.refresh();
        });
      } else {
        // Handle API error
        console.error(
          "Failed to update budget actual value:",
          await res.json()
        );
        // Revert UI to the last saved value on error
        setActualInput(initialActual.toString());
      }
    } catch (error) {
      console.error("Network error during budget update:", error);
      // Revert UI to the last saved value on error
      setActualInput(initialActual.toString());
    }
  };

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
        {/* --- ACTUAL INPUT FIELD --- */}
        <div>
          <dt className="text-gray-500">Actual (Edit)</dt>
          {budget?.id ? (
            <input
              type="number"
              step="0.01"
              value={actualInput}
              onChange={(e) => setActualInput(e.target.value)}
              onBlur={updateActual} // Save on blur
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur(); // Trigger blur to save
                }
              }}
              className={`w-full font-medium p-0.5 border ${
                currentActual > planned ? "border-red-500" : "border-gray-300"
              } rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
              disabled={isPending}
            />
          ) : (
            <dd className="text-gray-500 italic">N/A</dd>
          )}
        </div>
        {/* -------------------------- */}
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
      {isPending && <p className="text-xs text-blue-500 mt-2">Saving...</p>}
    </div>
  );
}
