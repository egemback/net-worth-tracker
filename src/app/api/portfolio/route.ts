import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const portfolio = await prisma.portfolio.findMany({
    orderBy: { weight: "desc" },
  });
  return NextResponse.json(portfolio);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const portfolio = body.portfolio;

    if (!Array.isArray(portfolio) || portfolio.length === 0) {
      return NextResponse.json(
        { message: "Invalid or empty portfolio array provided." },
        { status: 400 }
      );
    }

    const tickersToKeep = portfolio.map((item) => item.ticker);

    const upsertOperations = portfolio.map((item) =>
      prisma.portfolio.upsert({
        where: { ticker: item.ticker },
        update: {
          // Update the weight if the record already exists
          weight: item.weight,
        },
        create: {
          // Create a new record if it doesn't exist
          ticker: item.ticker,
          weight: item.weight,
        },
      })
    );

    const deleteOperation = prisma.portfolio.deleteMany({
      where: {
        ticker: {
          notIn: tickersToKeep,
        },
      },
    });

    await prisma.$transaction(upsertOperations, deleteOperation);

    // Return the count of records created
    return NextResponse.json(
      {
        message: `Successfully added ${portfolio.length} assets.`,
        count: portfolio.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Portfolio save error:", error);
    return NextResponse.json(
      { message: "Failed to save portfolio.", error: (error as Error).message },
      { status: 500 }
    );
  }
}
