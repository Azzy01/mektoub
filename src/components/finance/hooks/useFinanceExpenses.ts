'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FinanceExpenseWithRefs } from '../../../lib/types'
import {
  getFinanceMonthSummary,
  listFinanceExpenses,
  type FinanceExpenseFilters,
} from '../../../lib/repo'

export function useFinanceExpenses(filters: FinanceExpenseFilters) {
  const { month, categoryId, subcategoryId, q } = filters
  const [expenses, setExpenses] = useState<FinanceExpenseWithRefs[]>([])
  const [total, setTotal] = useState(0)
  const [topCategories, setTopCategories] = useState<
    Array<{ category_id: string; category_name: string; amount: number }>
  >([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [rows, summary] = await Promise.all([
      listFinanceExpenses({ month, categoryId, subcategoryId, q }),
      getFinanceMonthSummary(month),
    ])
    setExpenses(rows)
    setTotal(summary.total)
    setTopCategories(summary.topCategories)
    setLoading(false)
  }, [categoryId, month, q, subcategoryId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    expenses,
    total,
    topCategories,
    loading,
    refresh,
  }
}
