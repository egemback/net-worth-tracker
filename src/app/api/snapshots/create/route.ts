import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  // compute totals and save a snapshot
  const [assets, liabilities] = await Promise.all([
    prisma.asset.findMany(),
    prisma.liability.findMany(),
  ])
  const totalAssets = assets.reduce((s, a) => s + Number(a.value), 0)
  const totalLiabilities = liabilities.reduce((s, l) => s + Number(l.balance), 0)
  const netWorth = totalAssets - totalLiabilities
  const snap = await prisma.snapshot.create({ data: { netWorth } as any })
  return NextResponse.json(snap, { status: 201 })
}

