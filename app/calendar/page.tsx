'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '../../src/components/shell/AppShell'
import { createNote, listNotes } from '../../src/lib/repo'
import { syncNow } from '../../src/lib/sync'
import type { Note } from '../../src/lib/types'
import { useAuth } from '../../src/lib/auth'

type ViewMode = 'week' | 'biweek' | 'month'

function startOfWeek(d: Date) {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7 // Monday = 0
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - day)
  return x
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function addDays(d: Date, days: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

function formatDay(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function Page() {
  const router = useRouter()
  const { authed } = useAuth()
  const [mode, setMode] = useState<ViewMode>('week')
  const [anchor, setAnchor] = useState<Date>(new Date())
  const [tasks, setTasks] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingFor, setCreatingFor] = useState<Date | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newTags, setNewTags] = useState('')
  const [newPriority, setNewPriority] = useState(3)
  const [newUrgent, setNewUrgent] = useState(false)

  const loadLocal = useCallback(async () => {
    setLoading(true)
    const rows = await listNotes({
      type: 'task',
      status: 'open',
      includePrivate: authed,
    })
    setTasks(rows.filter((t) => !!t.due_at))
    setLoading(false)
  }, [authed])

  const refresh = useCallback(async () => {
    await syncNow()
    await loadLocal()
  }, [loadLocal])

  useEffect(() => {
    void refresh()
    const onSync = () => void loadLocal()
    window.addEventListener('mektoub-sync-complete', onSync)
    return () => window.removeEventListener('mektoub-sync-complete', onSync)
  }, [loadLocal, refresh])

  const range = useMemo(() => {
    if (mode === 'month') {
      const start = startOfWeek(startOfMonth(anchor))
      const end = addDays(start, 41) // 6 weeks grid
      return { start, end, days: 42 }
    }
    const start = startOfWeek(anchor)
    const days = mode === 'biweek' ? 14 : 7
    const end = addDays(start, days - 1)
    return { start, end, days }
  }, [mode, anchor])

  const days = useMemo(() => {
    const arr: Date[] = []
    for (let i = 0; i < range.days; i++) arr.push(addDays(range.start, i))
    return arr
  }, [range])

  const tasksByDay = useMemo(() => {
    const map: Record<string, Note[]> = {}
    for (const t of tasks) {
      const d = new Date(t.due_at as string)
      const key = d.toDateString()
      if (!map[key]) map[key] = []
      map[key].push(t)
    }
    return map
  }, [tasks])

  function goPrev() {
    if (mode === 'month') {
      setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))
      return
    }
    setAnchor(addDays(anchor, mode === 'biweek' ? -14 : -7))
  }

  function goNext() {
    if (mode === 'month') {
      setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))
      return
    }
    setAnchor(addDays(anchor, mode === 'biweek' ? 14 : 7))
  }

  function goToday() {
    setAnchor(new Date())
  }

  async function createTaskForDay(d: Date) {
    const title = newTitle.trim()
    if (!title) return
    const due = new Date(d)
    due.setHours(18, 0, 0, 0)
    await createNote({
      type: 'task',
      title,
      content: newContent.trim(),
      due_at: due.toISOString(),
      tags: newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      priority: newPriority,
      urgent: newUrgent ? 1 : 0,
    })
    await syncNow()
    setNewTitle('')
    setNewContent('')
    setNewTags('')
    setNewPriority(3)
    setNewUrgent(false)
    setCreatingFor(null)
    await refresh()
  }

  return (
    <AppShell left={<div className="text-sm opacity-70">Calendar</div>}>
      <div className="space-y-4">
        <div className="border rounded p-4 flex items-center gap-2">
          <div className="font-semibold text-lg">Calendar</div>
          <div className="ml-auto flex items-center gap-2">
            <button className="border rounded px-2 py-1 text-sm hover:bg-white/10" onClick={goPrev}>
              ←
            </button>
            <button className="border rounded px-2 py-1 text-sm hover:bg-white/10" onClick={goToday}>
              Today
            </button>
            <button className="border rounded px-2 py-1 text-sm hover:bg-white/10" onClick={goNext}>
              →
            </button>
          </div>
        </div>

        <div className="border rounded p-3 flex items-center gap-2">
          <span className="text-sm opacity-70">View</span>
          <button
            className={`border rounded px-2 py-1 text-sm ${mode === 'week' ? 'bg-white/15 border-white/30' : 'hover:bg-white/10'}`}
            onClick={() => setMode('week')}
          >
            Weekly
          </button>
          <button
            className={`border rounded px-2 py-1 text-sm ${mode === 'biweek' ? 'bg-white/15 border-white/30' : 'hover:bg-white/10'}`}
            onClick={() => setMode('biweek')}
          >
            Bi-weekly
          </button>
          <button
            className={`border rounded px-2 py-1 text-sm ${mode === 'month' ? 'bg-white/15 border-white/30' : 'hover:bg-white/10'}`}
            onClick={() => setMode('month')}
          >
            Monthly
          </button>
          <div className="ml-auto text-xs opacity-70">
            {mode === 'month'
              ? anchor.toLocaleString(undefined, { month: 'long', year: 'numeric' })
              : `${range.start.toLocaleDateString()} – ${range.end.toLocaleDateString()}`}
          </div>
        </div>

        {loading && <div className="border rounded p-4 opacity-70">Loading…</div>}

        {!loading && (
          <div className="space-y-2 calendar-scroll">
            <div className="calendar-grid">
              <div className="grid grid-cols-7 gap-2 text-xs calendar-head">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div key={d} className="text-center">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid gap-2 grid-cols-7 mt-2">
                {days.map((d) => {
                  const isToday = sameDay(d, new Date())
                  const inMonth = d.getMonth() === anchor.getMonth()
                  const list = tasksByDay[d.toDateString()] || []
                  return (
                    <div
                      key={d.toDateString()}
                      className={`group calendar-cell p-2 min-h-[120px] ${
                        isToday ? 'calendar-today' : ''
                      } ${
                        mode === 'month' && !inMonth ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-xs opacity-80">{formatDay(d)}</div>
                        <button
                          className="ml-auto text-xs border rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
                          onClick={() => {
                            setCreatingFor(d)
                            setNewTitle('')
                            setNewContent('')
                            setNewTags('')
                            setNewPriority(3)
                            setNewUrgent(false)
                          }}
                          title="Add task"
                        >
                          +
                        </button>
                      </div>
                      <div className="mt-2 space-y-1">
                        {list.length === 0 && <div className="text-xs opacity-40">—</div>}
                        {list.map((t) => (
                          <button
                            key={t.id}
                            className="w-full text-left text-xs border rounded px-2 py-1 hover:bg-white/10 truncate"
                            onClick={() => router.push(`/note?id=${t.id}&from=calendar`)}
                            title={t.title}
                          >
                            {t.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {creatingFor && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setCreatingFor(null)}
          >
            <div
              className="w-full max-w-md border rounded bg-[var(--background)] text-[var(--foreground)] p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="font-semibold">Add task</div>
              <div className="text-xs opacity-70 mt-1">
                {creatingFor.toLocaleDateString()}
              </div>
              <input
                className="mt-3 w-full border rounded px-3 py-2 bg-transparent"
                placeholder="Task title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createTaskForDay(creatingFor)
                }}
              />
              <textarea
                className="mt-3 w-full border rounded px-3 py-2 bg-transparent min-h-[120px]"
                placeholder="Content"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
              />
              <input
                className="mt-3 w-full border rounded px-3 py-2 bg-transparent"
                placeholder="Tags (comma separated)"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs opacity-70">Priority</label>
                  <select
                    className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
                    value={String(newPriority)}
                    onChange={(e) => setNewPriority(Number(e.target.value))}
                  >
                    <option value="1">1 (high)</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5 (low)</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newUrgent}
                      onChange={(e) => setNewUrgent(e.target.checked)}
                    />
                    Urgent
                  </label>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  className="border rounded px-3 py-2 hover:bg-white/10"
                  onClick={() => createTaskForDay(creatingFor)}
                >
                  Add
                </button>
                <button
                  className="border rounded px-3 py-2 hover:bg-white/10"
                  onClick={() => setCreatingFor(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
