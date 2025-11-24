"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function MonthSelector() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640); // sm breakpoint = 640px
    handleResize(); // initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
    <div className="flex flex-row items-center justify-center lg:justify-start gap-2 sm:gap-3 rounded-lg border bg-white p-3 shadow-sm">
      <button
        onClick={handlePrevMonth}
        className="shrink-0 rounded bg-gray-100 px-4 py-2.5 sm:px-3 sm:py-1 hover:bg-gray-200 touch-manipulation min-h-[44px] sm:min-h-0"
      >
        ← Prev
      </button>
      <div className="text-center font-medium py-2 sm:py-0 sm:min-w-[150px]">
        {months[currentMonth - 1]} {currentYear}
      </div>
      {(!isCurrentMonth || isMobile) && (
        <button
          onClick={handleNextMonth}
          className="shrink-0 rounded bg-gray-100 px-4 py-2.5 sm:px-3 sm:py-1 hover:bg-gray-200 touch-manipulation min-h-[44px] sm:min-h-0"
          disabled={isCurrentMonth}
        >
          Next →
        </button>
      )}
      {!isCurrentMonth && !isMobile && (
        <button
          onClick={handleCurrentMonth}
          className="shrink-0 rounded bg-blue-600 px-4 py-2.5 sm:px-3 sm:py-1 text-white hover:bg-blue-700 touch-manipulation min-h-[44px] sm:min-h-0"
        >
          Current Month
        </button>
      )}
    </div>
  );
}
