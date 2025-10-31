import AddGoalButton from "@/components/AddGoalButton";
import GoalProgressCard from "@/components/GoalProgressCard";
import { prisma } from "@/lib/prisma";

async function getGoals() {
  return prisma.goal.findMany({
    orderBy: {
      deadline: "asc",
    },
  });
}

export default async function GoalsPage() {
  const goals = await getGoals();

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Financial Goals</h1>
        <AddGoalButton />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => (
          <GoalProgressCard key={goal.id} goal={goal} />
        ))}
      </div>

      {goals.length === 0 && (
        <div className="rounded-lg border-2 border-dashed p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">No goals yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new financial goal.
          </p>
        </div>
      )}
    </main>
  );
}
