import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() || ''
  const min = searchParams.get('min')
  const max = searchParams.get('max')
  const sort = searchParams.get('sort') || 'createdAt'
  const order = (searchParams.get('order') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(5, parseInt(searchParams.get('pageSize') || '20', 10)))

  const where: any = {
    AND: [
      q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { category: { contains: q, mode: 'insensitive' } }] } : {},
      min ? { value: { gte: Number(min) as any } } : {},
      max ? { value: { lte: Number(max) as any } } : {},
    ],
  }
  const allowed = new Set(['name','category','value','growthRate','monthlyContribution','createdAt','updatedAt'])
  const orderBy: any = allowed.has(sort) ? { [sort]: order } : { createdAt: 'desc' }

  const items = await prisma.asset.findMany({ where, orderBy, skip: (page-1)*pageSize, take: pageSize })
  const total = await prisma.asset.count({ where })
  const hasMore = page * pageSize < total
  return NextResponse.json({ items, hasMore, nextPage: hasMore ? page+1 : null })
}

