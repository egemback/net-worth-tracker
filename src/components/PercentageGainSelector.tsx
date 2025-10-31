"use client";

import { useState } from "react";
import { formatPercentage } from "@/utils/formatters";

interface PercentageGainSelectorProps {
  percentageGainThisYear: number;
  percentageGain12Months: number;
  percentageGain6Months: number;
  percentageGain3Months: number;
  percentageGain1Month: number;
}

export default function PercentageGainSelector({
  percentageGainThisYear,
  percentageGain12Months,
  percentageGain6Months,
  percentageGain3Months,
  percentageGain1Month,
}: PercentageGainSelectorProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("thisYear");

  const getPercentageForPeriod = () => {
    switch (selectedPeriod) {
      case "thisYear":
        return percentageGainThisYear;
      case "last12Months":
        return percentageGain12Months;
      case "last6Months":
        return percentageGain6Months;
      case "last3Months":
        return percentageGain3Months;
      case "lastMonth":
        return percentageGain1Month;
      default:
        return 0;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">Percentage Gain</span>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="text-sm text-gray-500 p-1 rounded border"
        >
          <option value="thisYear">This Year</option>
          <option value="last12Months">Last 12 Months</option>
          <option value="last6Months">Last 6 Months</option>
          <option value="last3Months">Last 3 Months</option>
          <option value="lastMonth">Last Month</option>
        </select>
      </div>
      <div className="text-2xl font-semibold">
        {formatPercentage(getPercentageForPeriod())}
      </div>
    </div>
  );
}
