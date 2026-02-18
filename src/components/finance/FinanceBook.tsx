'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { FinanceExpenseInput } from '../../lib/repo'
import {
  createFinanceExpense,
  currentMonthKey,
  deleteFinanceExpense,
  updateFinanceExpense,
} from '../../lib/repo'
import type { FinanceExpenseWithRefs, FinanceSubcategory } from '../../lib/types'
import FinanceShell from './FinanceShell'
import ExpenseModal from './ExpenseModal'
import { useFinanceDictionary } from './hooks/useFinanceDictionary'
import { useFinanceExpenses } from './hooks/useFinanceExpenses'

function currentDateInput() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function defaultDateForMonth(month: string) {
  const today = currentDateInput()
  if (today.slice(0, 7) === month) return today
  return `${month}-01`
}

function formatKzt(value: number) {
  return `${value.toLocaleString('en-US')} KZT`
}

function formatDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-')
    return `${d}.${m}.${y}`
  }
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return value
  return dt.toLocaleDateString()
}

export default function FinanceBook() {
  const dict = useFinanceDictionary()
  const [month, setMonth] = useState(currentMonthKey())
  const [filterCategoryId, setFilterCategoryId] = useState<string | 'all'>('all')
  const [filterSubcategoryId, setFilterSubcategoryId] = useState<string | 'all'>('all')
  const [q, setQ] = useState('')

  const expensesState = useFinanceExpenses({
    month,
    categoryId: filterCategoryId,
    subcategoryId: filterSubcategoryId,
    q,
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<FinanceExpenseWithRefs | null>(null)
  const [quickDate, setQuickDate] = useState(defaultDateForMonth(currentMonthKey()))
  const [quickTitle, setQuickTitle] = useState('')
  const [quickAmount, setQuickAmount] = useState('')
  const [quickCategoryId, setQuickCategoryId] = useState('')
  const [quickSubcategoryId, setQuickSubcategoryId] = useState('')
  const [quickSaving, setQuickSaving] = useState(false)
  const [quickError, setQuickError] = useState<string | null>(null)

  const filterSubcategoryOptions = useMemo(() => {
    if (filterCategoryId === 'all') return dict.subcategories
    return dict.subcategories.filter((s) => s.category_id === filterCategoryId)
  }, [dict.subcategories, filterCategoryId])

  const filterSubcategorySet = useMemo(
    () => new Set(filterSubcategoryOptions.map((x) => x.id)),
    [filterSubcategoryOptions]
  )

  const quickSubcategoryOptions = useMemo(
    () => dict.subcategories.filter((s) => s.category_id === quickCategoryId),
    [dict.subcategories, quickCategoryId]
  )

  const quickSubcategorySet = useMemo(
    () => new Set(quickSubcategoryOptions.map((x) => x.id)),
    [quickSubcategoryOptions]
  )

  useEffect(() => {
    if (filterSubcategoryId !== 'all' && !filterSubcategorySet.has(filterSubcategoryId)) {
      setFilterSubcategoryId('all')
    }
  }, [filterSubcategoryId, filterSubcategorySet])

  useEffect(() => {
    if (!quickCategoryId && dict.categories.length > 0) {
      setQuickCategoryId(dict.categories[0].id)
    }
  }, [dict.categories, quickCategoryId])

  useEffect(() => {
    if (quickSubcategoryId && !quickSubcategorySet.has(quickSubcategoryId)) {
      setQuickSubcategoryId('')
    }
  }, [quickSubcategoryId, quickSubcategorySet])

  useEffect(() => {
    setQuickDate((prev) => {
      const value = (prev ?? '').trim()
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
      return defaultDateForMonth(month)
    })
  }, [month])

  async function onSave(payload: FinanceExpenseInput) {
    if (!editing) return
    await updateFinanceExpense(editing.id, payload)
    await expensesState.refresh()
  }

  async function onDelete(id: string) {
    await deleteFinanceExpense(id)
    await expensesState.refresh()
  }

  async function saveQuickRow() {
    setQuickError(null)
    const title = quickTitle.trim()
    if (!title) {
      setQuickError('Title is required')
      return
    }
    const amount = Number(quickAmount)
    if (!Number.isInteger(amount) || amount <= 0) {
      setQuickError('Amount must be a positive integer')
      return
    }
    if (!quickCategoryId) {
      setQuickError('Category is required')
      return
    }
    if (quickSubcategoryId && !quickSubcategorySet.has(quickSubcategoryId)) {
      setQuickError('Subcategory must belong to selected category')
      return
    }

    setQuickSaving(true)
    try {
      await createFinanceExpense({
        date: quickDate,
        title,
        amount,
        category_id: quickCategoryId,
        subcategory_id: quickSubcategoryId || null,
      })
      setQuickTitle('')
      setQuickAmount('')
      setQuickSubcategoryId('')
      setQuickDate(defaultDateForMonth(month))
      await expensesState.refresh()
    } catch (e: any) {
      setQuickError(e?.message ?? 'Failed to add expense')
    } finally {
      setQuickSaving(false)
    }
  }

  function closeEditModal() {
    setModalOpen(false)
    setEditing(null)
  }

  return (
    <FinanceShell>
      <div className="space-y-4">
        <div className="border rounded p-4">
          <div className="font-semibold text-lg">Finance Book</div>
          <div className="mt-2 text-sm opacity-70">
            Track spending by category and subcategory.
          </div>
        </div>

        <div className="border rounded p-3 grid grid-cols-1 md:grid-cols-4 gap-2">
          <div>
            <label className="text-xs opacity-70">Month</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs opacity-70">Category</label>
            <select
              className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
              value={filterCategoryId}
              onChange={(e) => {
                setFilterCategoryId(e.target.value as string | 'all')
                setFilterSubcategoryId('all')
              }}
            >
              <option value="all">All categories</option>
              {dict.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs opacity-70">Subcategory</label>
            <select
              className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
              value={filterSubcategoryId}
              onChange={(e) => setFilterSubcategoryId(e.target.value as string | 'all')}
            >
              <option value="all">All subcategories</option>
              {filterSubcategoryOptions.map((s: FinanceSubcategory) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs opacity-70">Search</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Title or note"
            />
          </div>
        </div>

        <div className="border rounded p-4">
          <div className="font-semibold">Monthly summary</div>
          <div className="mt-1 text-sm opacity-80">
            Total spent: <span className="font-semibold">{formatKzt(expensesState.total)}</span>
          </div>
          <div className="mt-3">
            <div className="text-sm opacity-70">Top categories</div>
            <div className="mt-2 space-y-1">
              {expensesState.topCategories.length === 0 && (
                <div className="text-sm opacity-60">No expenses in selected month.</div>
              )}
              {expensesState.topCategories.map((row) => (
                <div
                  key={row.category_id}
                  className="flex items-center justify-between text-sm border rounded px-3 py-2"
                >
                  <span>{row.category_name}</span>
                  <span className="font-medium">{formatKzt(row.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {dict.categories.length === 0 && (
          <div className="border rounded p-4 text-sm">
            Dictionary is empty. Add categories first in{' '}
            <Link className="underline" href="/finance/dictionary">
              Finance Dictionary
            </Link>
            .
          </div>
        )}

        <div className="border rounded p-4">
          <div className="font-semibold">Expenses</div>
          {quickError && <div className="mt-3 text-sm text-red-400">{quickError}</div>}
          {expensesState.loading || dict.loading ? (
            <div className="mt-3 text-sm opacity-70">Loading…</div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-left opacity-70 border-b">
                    <th className="py-2 pr-2">Date</th>
                    <th className="py-2 pr-2">Title</th>
                    <th className="py-2 pr-2">Amount (KZT)</th>
                    <th className="py-2 pr-2">Category</th>
                    <th className="py-2 pr-2">Subcategory</th>
                    <th className="py-2 pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/10 bg-white/5">
                    <td className="py-2 pr-2">
                      <input
                        className="w-full border rounded px-2 py-1 bg-transparent"
                        type="date"
                        value={quickDate}
                        onChange={(e) => setQuickDate(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveQuickRow()
                        }}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        className="w-full border rounded px-2 py-1 bg-transparent"
                        value={quickTitle}
                        onChange={(e) => setQuickTitle(e.target.value)}
                        placeholder="Title"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveQuickRow()
                        }}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        className="w-full border rounded px-2 py-1 bg-transparent"
                        type="number"
                        min={1}
                        step={1}
                        value={quickAmount}
                        onChange={(e) => setQuickAmount(e.target.value)}
                        placeholder="0"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveQuickRow()
                        }}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        className="w-full border rounded px-2 py-1 bg-transparent"
                        value={quickCategoryId}
                        onChange={(e) => {
                          setQuickCategoryId(e.target.value)
                          setQuickSubcategoryId('')
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveQuickRow()
                        }}
                      >
                        <option value="">Select</option>
                        {dict.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        className="w-full border rounded px-2 py-1 bg-transparent"
                        value={quickSubcategoryId}
                        onChange={(e) => setQuickSubcategoryId(e.target.value)}
                        disabled={!quickCategoryId}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveQuickRow()
                        }}
                      >
                        <option value="">None</option>
                        {quickSubcategoryOptions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <button
                        className="border rounded px-3 py-1 hover:bg-white/10 disabled:opacity-60"
                        onClick={() => void saveQuickRow()}
                        disabled={quickSaving || dict.categories.length === 0}
                      >
                        {quickSaving ? 'Saving...' : 'Save'}
                      </button>
                    </td>
                  </tr>
                  {expensesState.expenses.map((row) => (
                    <tr key={row.id} className="border-b border-white/10">
                      <td className="py-2 pr-2">{formatDate(row.date)}</td>
                      <td className="py-2 pr-2">
                        <button
                          className="underline"
                          onClick={() => {
                            setEditing(row)
                            setModalOpen(true)
                          }}
                        >
                          {row.title}
                        </button>
                      </td>
                      <td className="py-2 pr-2 font-medium">{formatKzt(row.amount)}</td>
                      <td className="py-2 pr-2">{row.category_name}</td>
                      <td className="py-2 pr-2">{row.subcategory_name || '—'}</td>
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2">
                          <button
                            className="border rounded px-2 py-1 hover:bg-white/10"
                            onClick={() => {
                              setEditing(row)
                              setModalOpen(true)
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="border rounded px-2 py-1 hover:bg-white/10"
                            onClick={async () => {
                              if (!confirm(`Delete expense "${row.title}"?`)) return
                              await onDelete(row.id)
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {expensesState.expenses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-sm opacity-70">
                        No expenses found for current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ExpenseModal
        open={modalOpen && !!editing}
        mode="edit"
        categories={dict.categories}
        subcategories={dict.subcategories}
        initialExpense={editing}
        onClose={closeEditModal}
        onSave={onSave}
        onDelete={
          editing
            ? async () => {
                await onDelete(editing.id)
              }
            : undefined
        }
      />
    </FinanceShell>
  )
}
