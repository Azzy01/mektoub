'use client'

import { useEffect, useMemo, useState } from 'react'
import type {
  FinanceCategory,
  FinanceExpenseWithRefs,
  FinanceSubcategory,
} from '../../lib/types'
import type { FinanceExpenseInput } from '../../lib/repo'

function todayDateInput() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toDateInput(raw: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return todayDateInput()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function tagsToInput(tags: string[]) {
  return tags.join(', ')
}

function tagsFromInput(input: string) {
  const raw = input
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
  return Array.from(new Set(raw)).slice(0, 20)
}

export default function ExpenseModal(props: {
  open: boolean
  mode: 'create' | 'edit'
  categories: FinanceCategory[]
  subcategories: FinanceSubcategory[]
  initialExpense?: FinanceExpenseWithRefs | null
  onClose: () => void
  onSave: (payload: FinanceExpenseInput) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const [date, setDate] = useState(todayDateInput())
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [note, setNote] = useState('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!props.open) return

    if (props.mode === 'edit' && props.initialExpense) {
      setDate(toDateInput(props.initialExpense.date))
      setTitle(props.initialExpense.title)
      setAmount(String(props.initialExpense.amount))
      setCategoryId(props.initialExpense.category_id)
      setSubcategoryId(props.initialExpense.subcategory_id ?? '')
      setNote(props.initialExpense.note ?? '')
      setTags(tagsToInput(props.initialExpense.tags ?? []))
    } else {
      setDate(todayDateInput())
      setTitle('')
      setAmount('')
      setCategoryId(props.categories[0]?.id ?? '')
      setSubcategoryId('')
      setNote('')
      setTags('')
    }
    setSaving(false)
    setError(null)
  }, [props.categories, props.initialExpense, props.mode, props.open])

  const categoryOptions = props.categories
  const subcategoryOptions = useMemo(
    () => props.subcategories.filter((s) => s.category_id === categoryId),
    [categoryId, props.subcategories]
  )

  useEffect(() => {
    if (!subcategoryId) return
    const valid = subcategoryOptions.some((s) => s.id === subcategoryId)
    if (!valid) setSubcategoryId('')
  }, [subcategoryId, subcategoryOptions])

  if (!props.open) return null

  async function submit() {
    setError(null)
    const cleanTitle = title.trim()
    if (!cleanTitle) {
      setError('Title is required')
      return
    }
    const nAmount = Number(amount)
    if (!Number.isInteger(nAmount) || nAmount <= 0) {
      setError('Amount must be a positive integer')
      return
    }
    if (!categoryId) {
      setError('Category is required')
      return
    }
    if (
      subcategoryId &&
      !subcategoryOptions.some((s) => s.id === subcategoryId)
    ) {
      setError('Subcategory must belong to selected category')
      return
    }

    setSaving(true)
    try {
      await props.onSave({
        date,
        title: cleanTitle,
        amount: nAmount,
        category_id: categoryId,
        subcategory_id: subcategoryId || null,
        note,
        tags: tagsFromInput(tags),
      })
      props.onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save expense')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!props.onDelete) return
    if (!confirm('Delete this expense?')) return
    setSaving(true)
    setError(null)
    try {
      await props.onDelete()
      props.onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to delete expense')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={() => props.onClose()}
    >
      <div
        className="w-full max-w-2xl border rounded bg-[var(--background)] text-[var(--foreground)] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <div className="font-semibold text-lg">
            {props.mode === 'create' ? 'Add expense' : 'Edit expense'}
          </div>
          <button
            className="ml-auto border rounded px-2 py-1 text-sm hover:bg-white/10"
            onClick={() => props.onClose()}
            disabled={saving}
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs opacity-70">Date</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs opacity-70">Amount (KZT)</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
              type="number"
              min={1}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="5000"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs opacity-70">Title</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Petrol"
            />
          </div>

          <div>
            <label className="text-xs opacity-70">Category</label>
            <select
              className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Select category</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs opacity-70">Subcategory (optional)</label>
            <select
              className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              disabled={!categoryId}
            >
              <option value="">None</option>
              {subcategoryOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs opacity-70">Tags (comma separated)</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="car, urgent"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs opacity-70">Note (optional)</label>
            <textarea
              className="mt-1 w-full border rounded px-3 py-2 bg-transparent min-h-[120px]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Halyk Time City"
            />
          </div>
        </div>

        {error && <div className="mt-3 text-sm text-red-400">{error}</div>}

        <div className="mt-4 flex items-center gap-2">
          {props.mode === 'edit' && props.onDelete && (
            <button
              className="border rounded px-3 py-2 hover:bg-white/10"
              onClick={handleDelete}
              disabled={saving}
            >
              Delete
            </button>
          )}
          <button
            className="ml-auto border rounded px-3 py-2 hover:bg-white/10"
            onClick={() => props.onClose()}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="border rounded px-3 py-2 hover:bg-white/10 disabled:opacity-60"
            onClick={submit}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
