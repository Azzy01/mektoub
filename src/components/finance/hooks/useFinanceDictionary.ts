'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FinanceCategory, FinanceSubcategory } from '../../../lib/types'
import { listFinanceCategories, listFinanceSubcategories } from '../../../lib/repo'

export function useFinanceDictionary() {
  const [categories, setCategories] = useState<FinanceCategory[]>([])
  const [subcategories, setSubcategories] = useState<FinanceSubcategory[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [cats, subs] = await Promise.all([
      listFinanceCategories(),
      listFinanceSubcategories(),
    ])
    setCategories(cats)
    setSubcategories(subs)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const subcategoriesByCategory = useMemo(() => {
    const map: Record<string, FinanceSubcategory[]> = {}
    for (const s of subcategories) {
      if (!map[s.category_id]) map[s.category_id] = []
      map[s.category_id].push(s)
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.name.localeCompare(b.name))
    }
    return map
  }, [subcategories])

  return {
    categories,
    subcategories,
    subcategoriesByCategory,
    loading,
    refresh,
  }
}
