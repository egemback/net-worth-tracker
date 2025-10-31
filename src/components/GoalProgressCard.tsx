import { Goal } from "@prisma/client";
import { calculateGoalProgress } from "@/utils/financialMetrics";
import { formatCurrency, formatPercentage } from "@/utils/formatters";

interface GoalProgressCardProps {
  goal: Goal;
}

export default async function GoalProgressCard({
  goal,
}: GoalProgressCardProps) {
  const { progressPercentage, currentValue } = await calculateGoalProgress(
    goal.target,
    goal.type
  );

  const priorityColors = {
    1: "bg-blue-100 text-blue-800",
    2: "bg-yellow-100 text-yellow-800",
    3: "bg-red-100 text-red-800",
  };

  const typeLabels = {
    netWorth: "Net Worth",
    saving: "Assets",
    debtReduction: "Debt Reduction",
    custom: "Custom",
  };

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="font-medium">{goal.name}</h3>
          <p className="text-sm text-gray-500">
            {typeLabels[goal.type as keyof typeof typeLabels]}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${
            priorityColors[goal.priority as keyof typeof priorityColors]
          }`}
        >
          {goal.priority === 1
            ? "Low"
            : goal.priority === 2
            ? "Medium"
            : "High"}
        </span>
      </div>

      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span>Progress</span>
          <span>{formatPercentage(progressPercentage)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full bg-green-500`}
            style={{ width: `${formatPercentage(progressPercentage)}` }}
          />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-gray-500">Target</dt>
          <dd className="font-medium">{formatCurrency(goal.target)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Current</dt>
          <dd className="font-medium">{formatCurrency(currentValue || 0)}</dd>
        </div>
      </dl>

      {goal.notes && <p className="mt-4 text-sm text-gray-500">{goal.notes}</p>}
    </div>
  );
}
