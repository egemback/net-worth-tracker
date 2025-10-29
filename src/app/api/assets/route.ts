import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const assets = await prisma.asset.findMany({ orderBy: { value: "desc" } });
  return NextResponse.json(assets);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const asset = await prisma.asset.create({ data });
  return NextResponse.json(asset, { status: 201 });
}
