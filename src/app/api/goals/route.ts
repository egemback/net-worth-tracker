import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const goal = await prisma.goal.upsert({
      where: { name: json.name },
      update: {
        type: json.type,
        target: json.target,
        deadline: json.deadline,
        priority: json.priority,
        notes: json.notes,
      },
      create: {
        name: json.name,
        type: json.type,
        target: json.target,
        deadline: json.deadline,
        priority: json.priority,
        notes: json.notes,
      },
    });

    return NextResponse.json(goal);
  } catch (error) {
    console.error("Error creating goal:", error);
    return NextResponse.json({ error: "Error creating goal" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const goals = await prisma.goal.findMany({
      orderBy: {
        deadline: "asc",
      },
    });

    return NextResponse.json(goals);
  } catch (error) {
    console.error("Error fetching goals:", error);
    return NextResponse.json(
      { error: "Error fetching goals" },
      { status: 500 }
    );
  }
}
