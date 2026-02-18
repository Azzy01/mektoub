'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Goal, GoalStatus } from '../../lib/types'

function todayIso() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(isoDate: string, days: number) {
  const dt = new Date(`${isoDate}T00:00:00Z`)
  dt.setUTCDate(dt.getUTCDate() + days)
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function descendantsOf(goalId: string, goals: Goal[]) {
  const byParent = new Map<string, string[]>()
  for (const g of goals) {
    if (!g.parent_id) continue
    const arr = byParent.get(g.parent_id) ?? []
    arr.push(g.id)
    byParent.set(g.parent_id, arr)
  }

  const blocked = new Set<string>()
  const stack = [...(byParent.get(goalId) ?? [])]
  while (stack.length) {
    const id = stack.pop() as string
    if (blocked.has(id)) continue
    blocked.add(id)
    const next = byParent.get(id) ?? []
    for (const childId of next) stack.push(childId)
  }
  return blocked
}

export type GoalModalPayload = {
  parent_id: string | null
  title: string
  description: string
  status: GoalStatus
  progress: number
  start_date: string
  end_date: string
  color: string | null
}

export default function GoalModal(props: {
  open: boolean
  goal?: Goal | null
  goals: Goal[]
  onClose: () => void
  onSave: (payload: GoalModalPayload) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<GoalStatus>('open')
  const [progress, setProgress] = useState(0)
  const [startDate, setStartDate] = useState(todayIso())
  const [endDate, setEndDate] = useState(addDays(todayIso(), 7))
  const [parentId, setParentId] = useState('')
  const [color, setColor] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!props.open) return
    if (props.goal) {
      setTitle(props.goal.title)
      setDescription(props.goal.description)
      setStatus(props.goal.status)
      setProgress(props.goal.progress)
      setStartDate(props.goal.start_date)
      setEndDate(props.goal.end_date)
      setParentId(props.goal.parent_id ?? '')
      setColor(props.goal.color ?? '')
    } else {
      const today = todayIso()
      setTitle('')
      setDescription('')
      setStatus('open')
      setProgress(0)
      setStartDate(today)
      setEndDate(addDays(today, 7))
      setParentId('')
      setColor('')
    }
    setSaving(false)
    setError(null)
  }, [props.goal, props.open])

  const blockedParents = useMemo(
    () => (props.goal ? descendantsOf(props.goal.id, props.goals) : new Set<string>()),
    [props.goal, props.goals]
  )

  const parentOptions = useMemo(() => {
    return props.goals.filter((g) => {
      if (props.goal && g.id === props.goal.id) return false
      if (blockedParents.has(g.id)) return false
      return true
    })
  }, [blockedParents, props.goal, props.goals])

  if (!props.open) return null

  async function submit() {
    setError(null)
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      setError('Start and end date must be valid')
      return
    }
    const startMs = new Date(`${startDate}T00:00:00Z`).getTime()
    const endMs = new Date(`${endDate}T00:00:00Z`).getTime()
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      setError('Date is invalid')
      return
    }
    if (endMs < startMs) {
      setError('End date must be on or after start date')
      return
    }
    const p = Math.round(progress)
    if (p < 0 || p > 100) {
      setError('Progress must be between 0 and 100')
      return
    }
    const cleanColor = color.trim()
    if (cleanColor && !/^#[0-9a-fA-F]{6}$/.test(cleanColor)) {
      setError('Color must be a hex value like #22c55e')
      return
    }

    setSaving(true)
    try {
      await props.onSave({
        parent_id: parentId || null,
        title: title.trim(),
        description: description.trim(),
        status,
        progress: p,
        start_date: startDate,
        end_date: endDate,
        color: cleanColor || null,
      })
      props.onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save goal')
    } finally {
      setSaving(false)
    }
  }

  async function deleteCurrent() {
    if (!props.onDelete) return
    if (!confirm('Delete this goal?')) return
    setSaving(true)
    setError(null)
    try {
      await props.onDelete()
      props.onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to delete goal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={props.onClose}
    >
      <div
        className="w-full max-w-2xl border rounded bg-[var(--background)] text-[var(--foreground)] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <div className="font-semibold text-lg">{props.goal ? 'Edit goal' : 'Create goal'}</div>
          <button
            className="ml-auto border rounded px-2 py-1 text-sm hover:bg-white/10"
            onClick={props.onClose}
            disabled={saving}
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs opacity-70">Title</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Goal title"
            />
          </div>

          <div>
            <label className="text-xs opacity-70">Start date</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs opacity-70">End date</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs opacity-70">Parent goal (optional)</label>
            <select
              className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
            >
              <option value="">None</option>
              {parentOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs opacity-70">Status</label>
            <select
              className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
              value={status}
              onChange={(e) => setStatus(e.target.value as GoalStatus)}
            >
              <option value="open">Open</option>
              <option value="done">Done</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label className="text-xs opacity-70">Progress (%)</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
              type="number"
              min={0}
              max={100}
              step={1}
              value={String(progress)}
              onChange={(e) => setProgress(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="text-xs opacity-70">Color (optional)</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#22c55e"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs opacity-70">Description / Notes</label>
            <textarea
              className="mt-1 w-full border rounded px-3 py-2 bg-transparent min-h-[120px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details"
            />
          </div>
        </div>

        {error && <div className="mt-3 text-sm text-red-400">{error}</div>}

        <div className="mt-4 flex items-center gap-2">
          {props.goal && props.onDelete ? (
            <button
              className="border rounded px-3 py-2 hover:bg-white/10"
              onClick={deleteCurrent}
              disabled={saving}
            >
              Delete
            </button>
          ) : null}
          <button
            className="ml-auto border rounded px-3 py-2 hover:bg-white/10"
            onClick={props.onClose}
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
