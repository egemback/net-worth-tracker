import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Find or create snapshot for current month/year
  let snapshot = await prisma.snapshot.findUnique({
    where: { year_month: { year, month } },
  });

  if (!snapshot) {
    snapshot = await prisma.snapshot.create({
      data: { year, month },
    });
  }

  // Fetch all assets and liabilities
  const assets = await prisma.asset.findMany();
  const liabilities = await prisma.liability.findMany();

  // Delete existing records for this snapshot to replace with new data
  await prisma.asset.deleteMany({
    where: { snapshotId: snapshot.id },
  });
  await prisma.liability.deleteMany({
    where: { snapshotId: snapshot.id },
  });

  // Insert fresh copies
  await prisma.asset.createMany({
    data: assets.map((a) => ({
      snapshotId: snapshot.id,
      assetId: a.id,
      name: a.name,
      category: a.category,
      value: a.value,
      growthRate: a.growthRate,
      monthlyContribution: a.monthlyContribution,
    })),
  });

  await prisma.liability.createMany({
    data: liabilities.map((l) => ({
      snapshotId: snapshot.id,
      liabilityId: l.id,
      name: l.name,
      category: l.category,
      balance: l.balance,
      interestRate: l.interestRate,
      monthlyPayment: l.monthlyPayment,
      termMonths: l.termMonths,
    })),
  });

  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
  const netWorth = totalAssets - totalLiabilities;

  await prisma.snapshot.update({
    where: { id: snapshot.id },
    data: {
      netWorth: netWorth,
      assets: { connect: assets.map((a) => ({ id: a.id })) },
      liabilities: { connect: liabilities.map((l) => ({ id: l.id })) },
    },
  });

  return NextResponse.json({ success: true, snapshot });
}
