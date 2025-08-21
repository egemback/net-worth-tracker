export type Asset = {
  id: number
  name: string
  category: string
  value: any
  currency: string
  growthRate?: number | null
  createdAt: string | Date
  updatedAt: string | Date
}

export type Liability = {
  id: number
  name: string
  category: string
  balance: any
  interestRate?: number | null
  minimumPay?: any | null
  createdAt: string | Date
  updatedAt: string | Date
}

