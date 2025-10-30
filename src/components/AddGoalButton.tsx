"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddGoalButton() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const response = await fetch("/api/goals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: formData.get("name"),
        type: formData.get("type"),
        target: Number(formData.get("target")),
        deadline: new Date(formData.get("deadline") as string),
        priority: Number(formData.get("priority")),
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
        Add Goal
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-4 text-lg font-medium">Add New Goal</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                  <input
                    type="text"
                    name="name"
                    required
                    className="mt-1 block w-full rounded-md border px-3 py-2"
                  />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Type
                  <select
                    name="type"
                    required
                    className="mt-1 block w-full rounded-md border px-3 py-2"
                  >
                    <option value="netWorth">Net Worth</option>
                    <option value="saving">Saving</option>
                    <option value="debtReduction">Debt Reduction</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Target Amount (SEK)
                  <input
                    type="number"
                    name="target"
                    required
                    className="mt-1 block w-full rounded-md border px-3 py-2"
                  />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Deadline
                  <input
                    type="date"
                    name="deadline"
                    required
                    className="mt-1 block w-full rounded-md border px-3 py-2"
                  />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Priority
                  <select
                    name="priority"
                    required
                    className="mt-1 block w-full rounded-md border px-3 py-2"
                  >
                    <option value="1">Low</option>
                    <option value="2">Medium</option>
                    <option value="3">High</option>
                  </select>
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
