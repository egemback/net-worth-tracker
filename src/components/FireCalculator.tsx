"use client";

import { useState } from "react";

export default function FireCalculator({
  netWorth,
  assets,
}: {
  netWorth: number;
  assets: number;
}) {
  const [annualSpending, setAnnualSpending] = useState(400000); // in SEK
  const [withdrawalRate, setWithdrawalRate] = useState(0.04);
  const [expectedReturn, setExpectedReturn] = useState(0.1);
  const [monthlyInvestment, setMonthlyInvestment] = useState(10000);
  const [calculationBase, setCalculationBase] = useState("assets");
  const [age, setAge] = useState(22);

  // FIRE number = annualSpending / withdrawalRate
  const fireNumber = annualSpending / withdrawalRate;

  // Future value with monthly contributions
  // FV = P*(1+r)^t + PMT * [((1+r)^t - 1)/r]
  // Convert expectedReturn (annual) to monthly
  const r = expectedReturn / 12;
  const yearsToSimulate = 100; // safety upper bound
  const calculationBaseValue = calculationBase === "assets" ? assets : netWorth;
  let projection = calculationBaseValue;
  let yearsToFire = Infinity;

  for (let i = 0; i < yearsToSimulate * 12; i++) {
    projection = projection * (1 + r) + monthlyInvestment;
    if (projection >= fireNumber) {
      yearsToFire = i / 12;
      break;
    }
  }

  const futureAge = age + (yearsToFire === Infinity ? 0 : yearsToFire);
  const progress = Math.min((calculationBaseValue / fireNumber) * 100, 100);
  console.log({ progress, calculationBase, fireNumber });

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm space-y-4">
      <h2 className="text-lg font-medium mb-2">FIRE Calculator</h2>

      <div className="grid grid-cols-2 gap-4">
        <label>
          <span className="text-sm text-gray-600">Annual Spending (SEK)</span>
          <input
            type="number"
            value={annualSpending}
            onChange={(e) => setAnnualSpending(Number(e.target.value))}
            className="mt-1 w-full rounded border p-1"
          />
        </label>
        <label>
          <span className="text-sm text-gray-600">Withdrawal Rate (%)</span>
          <input
            type="number"
            step="0.01"
            value={withdrawalRate * 100}
            onChange={(e) => setWithdrawalRate(Number(e.target.value) / 100)}
            className="mt-1 w-full rounded border p-1"
          />
        </label>
        <label>
          <span className="text-sm text-gray-600">Expected Return (%)</span>
          <input
            type="number"
            step="0.01"
            value={expectedReturn * 100}
            onChange={(e) => setExpectedReturn(Number(e.target.value) / 100)}
            className="mt-1 w-full rounded border p-1"
          />
        </label>
        <label>
          <span className="text-sm text-gray-600">
            Monthly Investment (SEK)
          </span>
          <input
            type="number"
            value={monthlyInvestment}
            onChange={(e) => setMonthlyInvestment(Number(e.target.value))}
            className="mt-1 w-full rounded border p-1"
          />
        </label>
        <label>
          <span className="text-sm text-gray-600">Current Age</span>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="mt-1 w-full rounded border p-1"
          />
        </label>
        <label>
          <span className="text-sm text-gray-600">
            Calculate using Assets or Net Worth
          </span>
          <select
            value={calculationBase}
            onChange={(e) => setCalculationBase(e.target.value)}
            className="mt-1 w-full rounded border p-1"
          >
            <option value="assets">Assets</option>
            <option value="netWorth">Net Worth</option>
          </select>
        </label>
      </div>

      <div className="pt-2 space-y-2 text-sm">
        <div>
          <strong>FIRE Number:</strong> {fireNumber.toLocaleString()} SEK
        </div>
        <div>
          <strong>Years to FIRE:</strong>{" "}
          {yearsToFire === Infinity ? "N/A" : yearsToFire.toFixed(1) + " years"}
        </div>
        <div>
          <strong>Age of Retirement:</strong>{" "}
          {yearsToFire === Infinity ? "N/A" : futureAge.toFixed(0) + " years"}
        </div>
      </div>

      {/* Milestone tracker */}
      <div className="pt-4">
        <div className="flex justify-between text-sm mb-1">
          <span>Progress Toward FIRE</span>
          <span>{progress.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {calculationBaseValue.toLocaleString()} /{" "}
          {fireNumber.toLocaleString()} SEK
        </div>
      </div>
    </div>
  );
}
