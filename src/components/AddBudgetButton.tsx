"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AddBudgetButtonProps {
  categories: string[];
  year?: number;
  month?: number;
}

export default function AddBudgetButton({
  categories,
  year,
  month,
}: AddBudgetButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const response = await fetch("/api/budgets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category: formData.get("category"),
        planned: Number(formData.get("planned")),
        year: year || new Date().getFullYear(),
        month: month || new Date().getMonth() + 1,
        notes: formData.get("notes"),
      }),
    });

    if (response.ok) {
      setIsOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Add Budget
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-4 text-lg font-medium">Add Budget Category</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category
                  <select
                    name="category"
                    required
                    className="mt-1 block w-full rounded-md border px-3 py-2"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Planned Amount (SEK)
                  <input
                    type="number"
                    name="planned"
                    required
                    className="mt-1 block w-full rounded-md border px-3 py-2"
                  />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                  <textarea
                    name="notes"
                    rows={3}
                    className="mt-1 block w-full rounded-md border px-3 py-2"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded px-4 py-2 text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
