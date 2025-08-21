import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const snaps = await prisma.snapshot.findMany({ orderBy: { date: 'asc' } })
  const header = 'date,netWorth\n'
  const body = snaps.map(s => `${new Date(s.date).toISOString()},${s.netWorth}`).join('\n')
  const csv = header + body + '\n'
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="snapshots.csv"'
    }
  })
}

