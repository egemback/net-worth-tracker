import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const liabilities = await prisma.liability.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(liabilities)
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  const liability = await prisma.liability.create({ data })
  return NextResponse.json(liability, { status: 201 })
}

