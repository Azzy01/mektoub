'use client'

import { useEffect, useMemo, useState } from 'react'
import FinanceShell from './FinanceShell'
import {
  createFinanceCategory,
  createFinanceSubcategory,
  deleteFinanceCategory,
  deleteFinanceSubcategory,
  renameFinanceCategory,
  renameFinanceSubcategory,
} from '../../lib/repo'
import { useFinanceDictionary } from './hooks/useFinanceDictionary'

export default function DictionaryPage() {
  const dict = useFinanceDictionary()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newSubcategory, setNewSubcategory] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (dict.categories.length === 0) {
      setSelectedCategoryId('')
      return
    }
    if (!selectedCategoryId || !dict.categories.some((c) => c.id === selectedCategoryId)) {
      setSelectedCategoryId(dict.categories[0].id)
    }
  }, [dict.categories, selectedCategoryId])

  const q = search.trim().toLowerCase()

  const filteredCategories = useMemo(() => {
    if (!q) return dict.categories
    const byCategoryName = dict.categories.filter((c) => c.name.toLowerCase().includes(q))
    const subMatchCategoryIds = new Set(
      dict.subcategories
        .filter((s) => s.name.toLowerCase().includes(q))
        .map((s) => s.category_id)
    )
    const fromSub = dict.categories.filter((c) => subMatchCategoryIds.has(c.id))
    const map = new Map<string, (typeof byCategoryName)[number]>()
    for (const c of [...byCategoryName, ...fromSub]) map.set(c.id, c)
    return [...map.values()]
  }, [dict.categories, dict.subcategories, q])

  const selectedCategory = dict.categories.find((c) => c.id === selectedCategoryId) ?? null
  const selectedSubcategories = useMemo(() => {
    const rows = dict.subcategories.filter((s) => s.category_id === selectedCategoryId)
    if (!q) return rows
    return rows.filter((s) => s.name.toLowerCase().includes(q))
  }, [dict.subcategories, selectedCategoryId, q])

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e: any) {
      setError(e?.message ?? 'Operation failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <FinanceShell>
      <div className="space-y-4">
        <div className="border rounded p-4">
          <div className="font-semibold text-lg">Dictionary</div>
          <div className="text-sm opacity-70 mt-1">
            Manage categories and subcategories for Finance Book.
          </div>
        </div>

        <div className="border rounded p-3">
          <label className="text-xs opacity-70">Search</label>
          <input
            className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
            placeholder="Search category or subcategory"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error && <div className="border rounded p-3 text-sm text-red-400">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border rounded p-4 space-y-3">
            <div className="font-semibold">Categories</div>
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded px-3 py-2 bg-transparent"
                placeholder="New category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  const name = newCategory.trim()
                  if (!name || busy) return
                  void withBusy(async () => {
                    const id = await createFinanceCategory(name)
                    setNewCategory('')
                    await dict.refresh()
                    setSelectedCategoryId(id)
                  })
                }}
              />
              <button
                className="border rounded px-3 py-2 hover:bg-white/10 disabled:opacity-60"
                disabled={busy || !newCategory.trim()}
                onClick={() => {
                  const name = newCategory.trim()
                  if (!name) return
                  void withBusy(async () => {
                    const id = await createFinanceCategory(name)
                    setNewCategory('')
                    await dict.refresh()
                    setSelectedCategoryId(id)
                  })
                }}
              >
                Add
              </button>
            </div>

            <div className="space-y-2">
              {dict.loading && <div className="text-sm opacity-70">Loading…</div>}
              {!dict.loading && filteredCategories.length === 0 && (
                <div className="text-sm opacity-70">No categories found.</div>
              )}
              {filteredCategories.map((cat) => {
                const count = dict.subcategories.filter((s) => s.category_id === cat.id).length
                const active = cat.id === selectedCategoryId
                return (
                  <div
                    key={cat.id}
                    className={`border rounded px-3 py-2 ${active ? 'bg-white/10 border-white/30' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        className="text-left flex-1"
                        onClick={() => setSelectedCategoryId(cat.id)}
                      >
                        {cat.name}
                      </button>
                      <span className="text-xs opacity-70">{count}</span>
                      <button
                        className="border rounded px-2 py-1 text-xs hover:bg-white/10"
                        onClick={() => {
                          const next = prompt('Rename category:', cat.name)
                          if (!next) return
                          void withBusy(async () => {
                            await renameFinanceCategory(cat.id, next)
                            await dict.refresh()
                          })
                        }}
                      >
                        Rename
                      </button>
                      <button
                        className="border rounded px-2 py-1 text-xs hover:bg-white/10"
                        onClick={() => {
                          if (!confirm(`Delete category "${cat.name}"?`)) return
                          void withBusy(async () => {
                            await deleteFinanceCategory(cat.id)
                            await dict.refresh()
                          })
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border rounded p-4 space-y-3">
            <div className="font-semibold">
              Subcategories {selectedCategory ? `for ${selectedCategory.name}` : ''}
            </div>
            {!selectedCategory && (
              <div className="text-sm opacity-70">Select a category to manage subcategories.</div>
            )}
            {selectedCategory && (
              <>
                <div className="flex gap-2">
                  <input
                    className="flex-1 border rounded px-3 py-2 bg-transparent"
                    placeholder="New subcategory"
                    value={newSubcategory}
                    onChange={(e) => setNewSubcategory(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      const name = newSubcategory.trim()
                      if (!name || busy) return
                      void withBusy(async () => {
                        await createFinanceSubcategory(selectedCategory.id, name)
                        setNewSubcategory('')
                        await dict.refresh()
                      })
                    }}
                  />
                  <button
                    className="border rounded px-3 py-2 hover:bg-white/10 disabled:opacity-60"
                    disabled={busy || !newSubcategory.trim()}
                    onClick={() => {
                      const name = newSubcategory.trim()
                      if (!name) return
                      void withBusy(async () => {
                        await createFinanceSubcategory(selectedCategory.id, name)
                        setNewSubcategory('')
                        await dict.refresh()
                      })
                    }}
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-2">
                  {selectedSubcategories.length === 0 && (
                    <div className="text-sm opacity-70">No subcategories found.</div>
                  )}
                  {selectedSubcategories.map((sub) => (
                    <div key={sub.id} className="border rounded px-3 py-2 flex items-center gap-2">
                      <div className="flex-1">{sub.name}</div>
                      <button
                        className="border rounded px-2 py-1 text-xs hover:bg-white/10"
                        onClick={() => {
                          const next = prompt('Rename subcategory:', sub.name)
                          if (!next) return
                          void withBusy(async () => {
                            await renameFinanceSubcategory(sub.id, next)
                            await dict.refresh()
                          })
                        }}
                      >
                        Rename
                      </button>
                      <button
                        className="border rounded px-2 py-1 text-xs hover:bg-white/10"
                        onClick={() => {
                          if (!confirm(`Delete subcategory "${sub.name}"?`)) return
                          void withBusy(async () => {
                            await deleteFinanceSubcategory(sub.id)
                            await dict.refresh()
                          })
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </FinanceShell>
  )
}
