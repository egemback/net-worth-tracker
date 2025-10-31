import { prisma } from "@/lib/prisma";
import { Budget } from "@prisma/client";
import AddBudgetButton from "@/components/AddBudgetButton";
import BudgetCategoryCard from "@/components/BudgetCategoryCard";

const CATEGORIES = [
  "Housing",
  "Transportation",
  "Food",
  "Utilities",
  "Insurance",
  "Entertainment",
  "Shopping",
  "Debt Payments",
  "Investments",
  "Savings",
  "Other",
];

function getPreviousMonth(year: number, month: number) {
  let prevYear = year;
  let prevMonth = month - 1;

  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear = year - 1;
  }
  return { prevYear, prevMonth };
}

async function getBudget(year?: number, month?: number): Promise<Budget[]> {
  const currentDate = new Date();
  const targetYear = year || currentDate.getFullYear();
  const targetMonth = month || currentDate.getMonth() + 1;

  let budgets = await prisma.budget.findMany({
    where: {
      year: targetYear,
      month: targetMonth,
    },
  });

  if (budgets.length === 0) {
    console.log(
      `No budgets found for ${targetYear}/${targetMonth}. Attempting to seed from previous month.`
    );

    const { prevYear, prevMonth } = getPreviousMonth(targetYear, targetMonth);

    const prevBudgets = await prisma.budget.findMany({
      where: {
        year: prevYear,
        month: prevMonth,
      },
    });

    const newBudgetsToCreate = CATEGORIES.map((category) => {
      const previousBudget = prevBudgets.find((b) => b.category === category);
      const plannedValue = previousBudget ? previousBudget.planned : 0;

      return {
        year: targetYear,
        month: targetMonth,
        category: category,
        planned: plannedValue,
        notes: previousBudget?.notes || null,
      };
    });

    await prisma.budget.createMany({
      data: newBudgetsToCreate,
    });

    budgets = await prisma.budget.findMany({
      where: {
        year: targetYear,
        month: targetMonth,
      },
    });
  }

  return budgets;
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const year = searchParams?.year ? parseInt(searchParams.year) : undefined;
  const month = searchParams?.month ? parseInt(searchParams.month) : undefined;

  const budgets = await getBudget(year, month);

  // Create a map of categories to their budgets
  const budgetMap = budgets.reduce((acc, budget) => {
    acc[budget.category] = budget;
    return acc;
  }, {} as Record<string, Budget>);

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Budget</h1>
        <AddBudgetButton categories={CATEGORIES} year={year} month={month} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((category) => (
          <BudgetCategoryCard
            key={category}
            category={category}
            budget={budgetMap[category]}
          />
        ))}
      </div>
    </main>
  );
}
