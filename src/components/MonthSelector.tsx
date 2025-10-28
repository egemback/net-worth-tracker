"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function MonthSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentDate = new Date();
  const currentYear = parseInt(
    searchParams.get("year") || String(currentDate.getFullYear())
  );
  const currentMonth = parseInt(
    searchParams.get("month") || String(currentDate.getMonth() + 1)
  );

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const handlePrevMonth = () => {
    let newMonth = currentMonth - 1;
    let newYear = currentYear;
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    router.push(`?year=${newYear}&month=${newMonth}`);
  };

  const handleNextMonth = () => {
    let newMonth = currentMonth + 1;
    let newYear = currentYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }

    if (
      newYear > currentDate.getFullYear() ||
      (newYear === currentDate.getFullYear() &&
        newMonth > currentDate.getMonth() + 1)
    ) {
      return; // Prevent navigating to future months
    }
    router.push(`?year=${newYear}&month=${newMonth}`);
  };

  const handleCurrentMonth = () => {
    router.push(
      `?year=${currentDate.getFullYear()}&month=${currentDate.getMonth() + 1}`
    );
  };

  const isCurrentMonth =
    currentYear === currentDate.getFullYear() &&
    currentMonth === currentDate.getMonth() + 1;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-white p-3 shadow-sm">
      <button
        onClick={handlePrevMonth}
        className="rounded bg-gray-100 px-3 py-1 hover:bg-gray-200"
      >
        ← Prev
      </button>
      <div className="text-center font-medium min-w-[150px]">
        {months[currentMonth - 1]} {currentYear}
      </div>
      {!isCurrentMonth && (
        <button
          onClick={handleNextMonth}
          className="rounded bg-gray-100 px-3 py-1 hover:bg-gray-200"
        >
          Next →
        </button>
      )}
      {!isCurrentMonth && (
        <button
          onClick={handleCurrentMonth}
          className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
        >
          Current Month
        </button>
      )}
    </div>
  );
}
