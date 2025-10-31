import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const uniqueConstraint = {
      year: json.year,
      month: json.month,
      category: json.category,
    };

    const budget = await prisma.budget.upsert({
      where: {
        year_month_category: uniqueConstraint,
      },
      update: {
        planned: json.planned,
        notes: json.notes,
      },
      create: {
        ...uniqueConstraint, // Includes year, month, category
        planned: json.planned,
        notes: json.notes,
      },
    });

    return NextResponse.json(budget);
  } catch (error) {
    console.error("Error processing budget request:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    const where = {
      ...(year && month
        ? {
            year: parseInt(year),
            month: parseInt(month),
          }
        : {}),
    };

    const budgets = await prisma.budget.findMany({
      where,
      orderBy: {
        category: "asc",
      },
    });

    return NextResponse.json(budgets);
  } catch (error) {
    console.error("Error fetching budgets:", error);
    return NextResponse.json(
      { error: "Error fetching budgets" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const json = await request.json();
    const actual = json.actual;
    const year = json.year;
    const month = json.month;
    const category = json.category;

    const updatedBudget = await prisma.budget.update({
      where: { year_month_category: { year, month, category } },
      data: {
        actual: actual, // Update only the actual value
      },
    });

    return NextResponse.json(updatedBudget);
  } catch (error) {
    console.error("Error updating budget:", error);
    return NextResponse.json(
      { error: "Failed to update budget" },
      { status: 500 }
    );
  }
}
