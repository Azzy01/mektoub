'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import AppShell from '../shell/AppShell'
import type { Goal, GoalStatus } from '../../lib/types'
import {
  createGoal,
  deleteGoal,
  listGoals,
  updateGoal,
} from '../../lib/repo'
import GoalModal, { type GoalModalPayload } from './GoalModal'
import GoalsToolbar from './GoalsToolbar'
import GanttView from './GanttView'
import ListView from './ListView'
import {
  getCurrentGoalsWindow,
  getTimelineWindow,
  shiftAnchor,
  type TimelineScale,
} from './gantt/utils'

type GoalTreeRow = {
  goal: Goal
  depth: number
  hasChildren: boolean
}

function sameSet(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false
  for (const item of a) {
    if (!b.has(item)) return false
  }
  return true
}

function sortGoals(a: Goal, b: Goal) {
  if (a.start_date !== b.start_date) return a.start_date.localeCompare(b.start_date)
  if (a.end_date !== b.end_date) return a.end_date.localeCompare(b.end_date)
  return a.created_at.localeCompare(b.created_at)
}

function buildRows(goals: Goal[], expanded: Set<string>) {
  const byId = new Map(goals.map((g) => [g.id, g]))
  const childrenByParent = new Map<string, Goal[]>()

  for (const g of goals) {
    const key = g.parent_id && byId.has(g.parent_id) ? g.parent_id : '__root__'
    const arr = childrenByParent.get(key) ?? []
    arr.push(g)
    childrenByParent.set(key, arr)
  }

  for (const [key, arr] of childrenByParent.entries()) {
    arr.sort(sortGoals)
    childrenByParent.set(key, arr)
  }

  const rows: GoalTreeRow[] = []
  const parents = new Set<string>()
  for (const g of goals) {
    if ((childrenByParent.get(g.id) ?? []).length > 0) {
      parents.add(g.id)
    }
  }

  function walk(parentKey: string, depth: number) {
    const children = childrenByParent.get(parentKey) ?? []
    for (const goal of children) {
      const hasChildren = (childrenByParent.get(goal.id) ?? []).length > 0
      rows.push({ goal, depth, hasChildren })
      if (hasChildren && expanded.has(goal.id)) {
        walk(goal.id, depth + 1)
      }
    }
  }

  walk('__root__', 0)
  return { rows, parents }
}

function parentGoalIds(goals: Goal[]) {
  const byId = new Set(goals.map((g) => g.id))
  const parents = new Set<string>()
  for (const g of goals) {
    if (!g.parent_id) continue
    if (byId.has(g.parent_id)) {
      parents.add(g.parent_id)
    }
  }
  return parents
}

export default function GoalsHome() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'gantt' | 'list'>('gantt')
  const [scale, setScale] = useState<TimelineScale>('current')
  const [anchorDate, setAnchorDate] = useState<Date>(new Date())
  const [status, setStatus] = useState<GoalStatus | 'all'>('open')
  const [q, setQ] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await listGoals({ status, q })
      setGoals(rows)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load goals')
    } finally {
      setLoading(false)
    }
  }, [q, status])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const tree = useMemo(() => buildRows(goals, expanded), [expanded, goals])
  const parents = useMemo(() => parentGoalIds(goals), [goals])
  const parentTitleById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const g of goals) map[g.id] = g.title
    return map
  }, [goals])

  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set<string>()
      for (const id of prev) {
        if (parents.has(id)) next.add(id)
      }
      if (next.size === 0 && parents.size > 0) {
        for (const id of parents) next.add(id)
      }
      if (sameSet(prev, next)) return prev
      return next
    })
  }, [parents])

  const window = useMemo(
    () =>
      scale === 'current'
        ? getCurrentGoalsWindow(goals, anchorDate)
        : getTimelineWindow(scale, anchorDate),
    [anchorDate, goals, scale]
  )

  async function handleSave(payload: GoalModalPayload) {
    if (editingGoal) {
      await updateGoal(editingGoal.id, payload)
    } else {
      await createGoal(payload)
    }
    await refresh()
  }

  async function handleDelete(goal: Goal, opts?: { rethrow?: boolean }) {
    try {
      await deleteGoal(goal.id)
      await refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to delete goal')
      if (opts?.rethrow) throw e
    }
  }

  return (
    <AppShell
      left={
        <div className="space-y-2">
          <div className="font-semibold">Goals</div>
          <div className="text-xs opacity-70">Visual planning</div>
          <div className="text-xs opacity-70">
            Total goals: <span className="opacity-100">{goals.length}</span>
          </div>
          <div className="text-xs opacity-70">
            Open: <span className="opacity-100">{goals.filter((g) => g.status === 'open').length}</span>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <GoalsToolbar
          q={q}
          onQChange={setQ}
          status={status}
          onStatusChange={setStatus}
          scale={scale}
          onScaleChange={(next) => {
            setScale(next)
            setAnchorDate(new Date())
          }}
          view={view}
          onViewChange={setView}
          rangeLabel={window.label}
          onPrev={() => setAnchorDate((d) => shiftAnchor(scale, d, -1))}
          onToday={() => setAnchorDate(new Date())}
          onNext={() => setAnchorDate((d) => shiftAnchor(scale, d, 1))}
          disableRangeNav={scale === 'current'}
          onCreate={() => {
            setEditingGoal(null)
            setModalOpen(true)
          }}
        />

        {error && <div className="border rounded p-3 text-sm text-red-400">{error}</div>}
        {loading ? (
          <div className="border rounded p-4 text-sm opacity-70">Loading goals…</div>
        ) : view === 'gantt' ? (
          <div className="space-y-2">
            <div className="border rounded px-3 py-2 flex items-center gap-2 text-sm">
              <span className="opacity-70">Rows: {tree.rows.length}</span>
              <button
                className="ml-auto border rounded px-2 py-1 hover:bg-white/10"
                onClick={() => {
                  const allParents = new Set<string>()
                  for (const id of parents) allParents.add(id)
                  setExpanded(allParents)
                }}
              >
                Expand all
              </button>
              <button
                className="border rounded px-2 py-1 hover:bg-white/10"
                onClick={() => setExpanded(new Set())}
              >
                Collapse all
              </button>
            </div>

            <GanttView
              rows={tree.rows}
              allGoals={goals}
              scale={scale}
              anchorDate={anchorDate}
              expanded={expanded}
              onToggleExpand={(id) =>
                setExpanded((prev) => {
                  const next = new Set(prev)
                  if (next.has(id)) next.delete(id)
                  else next.add(id)
                  return next
                })
              }
              onEdit={(goal) => {
                setEditingGoal(goal)
                setModalOpen(true)
              }}
            />
          </div>
        ) : (
          <ListView
            goals={[...goals].sort(sortGoals)}
            parentTitleById={parentTitleById}
            onEdit={(goal) => {
              setEditingGoal(goal)
              setModalOpen(true)
            }}
            onDelete={async (goal) => {
              await handleDelete(goal)
            }}
          />
        )}
      </div>

      <GoalModal
        open={modalOpen}
        goal={editingGoal}
        goals={goals}
        onClose={() => {
          setModalOpen(false)
          setEditingGoal(null)
        }}
        onSave={handleSave}
        onDelete={
          editingGoal
            ? async () => {
                await handleDelete(editingGoal, { rethrow: true })
              }
            : undefined
        }
      />
    </AppShell>
  )
}
