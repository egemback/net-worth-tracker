"use client";

import { Goal, Milestone } from "@prisma/client";
import { calculateGoalProgress } from "@/utils/financialMetrics";
import { formatCurrency } from "@/utils/formatters";

interface GoalProgressCardProps {
  goal: Goal & {
    milestones: Milestone[];
  };
}

export default function GoalProgressCard({ goal }: GoalProgressCardProps) {
  const { progressPercentage, onTrack, projectedCompletion } =
    calculateGoalProgress(
      goal.currentValue || 0,
      goal.target,
      goal.startDate,
      goal.deadline
    );

  const priorityColors = {
    1: "bg-blue-100 text-blue-800",
    2: "bg-yellow-100 text-yellow-800",
    3: "bg-red-100 text-red-800",
  };

  const typeLabels = {
    netWorth: "Net Worth",
    saving: "Saving",
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
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full ${
              onTrack ? "bg-green-500" : "bg-yellow-500"
            }`}
            style={{ width: `${progressPercentage}%` }}
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
          <dd className="font-medium">
            {formatCurrency(goal.currentValue || 0)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Deadline</dt>
          <dd className="font-medium">
            {new Date(goal.deadline).toLocaleDateString()}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Projected</dt>
          <dd
            className={`font-medium ${
              onTrack ? "text-green-600" : "text-yellow-600"
            }`}
          >
            {projectedCompletion.toLocaleDateString()}
          </dd>
        </div>
      </dl>

      {goal.notes && <p className="mt-4 text-sm text-gray-500">{goal.notes}</p>}

      {goal.milestones.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-sm font-medium">Milestones</h4>
          <ul className="space-y-2">
            {goal.milestones.map((milestone) => (
              <li
                key={milestone.id}
                className="flex items-center justify-between text-sm"
              >
                <span>{formatCurrency(milestone.target)}</span>
                <span className="text-gray-500">
                  {new Date(milestone.deadline).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
