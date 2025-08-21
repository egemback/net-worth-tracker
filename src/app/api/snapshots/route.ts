import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const snapshots = await prisma.snapshot.findMany({ orderBy: { date: 'desc' } })
  return NextResponse.json(snapshots)
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  const snapshot = await prisma.snapshot.create({ data })
  return NextResponse.json(snapshot, { status: 201 })
}

