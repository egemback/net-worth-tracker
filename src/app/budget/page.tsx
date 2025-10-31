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
  "Healthcare",
  "Entertainment",
  "Shopping",
  "Debt Payments",
  "Savings",
  "Other",
];

async function getBudget(year?: number, month?: number) {
  const currentDate = new Date();
  const targetYear = year || currentDate.getFullYear();
  const targetMonth = month || currentDate.getMonth() + 1;

  return prisma.budget.findMany({
    where: {
      year: targetYear,
      month: targetMonth,
    },
  });
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const year = searchParams?.year ? parseInt(searchParams.year) : undefined;
  const month = searchParams?.month ? parseInt(searchParams.month) : undefined;
  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Budget</h1>
        <AddBudgetButton categories={CATEGORIES} year={year} month={month} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((category) => (
          <BudgetCategoryCard key={category} category={category} />
        ))}
      </div>
    </main>
  );
}
