import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const budget = await prisma.budget.create({
      data: {
        category: json.category,
        planned: json.planned,
        year: json.year,
        month: json.month,
        notes: json.notes,
      },
    });

    return NextResponse.json(budget);
  } catch (error) {
    console.error("Error creating budget:", error);
    return NextResponse.json(
      { error: "Error creating budget" },
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
      include: {
        expenses: true,
      },
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
