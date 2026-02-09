'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '../../src/components/shell/AppShell'
import TodaySidebar from '../../src/components/today/TodaySidebar'
import { createNote, listNotes, updateNote } from '../../src/lib/repo'
import { useAuth } from '../../src/lib/auth'
import type { Note } from '../../src/lib/types'

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function addDays(d: Date, days: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

export default function Page() {
  const router = useRouter()
  const { authed } = useAuth()
  const [tasks, setTasks] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  const [projectMap, setProjectMap] = useState<Record<string, string>>({})

  async function load() {
    setLoading(true)
    const [rows, projects] = await Promise.all([
      listNotes({ type: 'task', status: 'open', includePrivate: authed }),
      listNotes({ type: 'project', status: 'all', includePrivate: authed }),
    ])
    setTasks(rows)
    const map: Record<string, string> = {}
    for (const p of projects) map[p.id] = p.title
    setProjectMap(map)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [authed])

  const today = useMemo(() => new Date(), [])
  const todayStart = useMemo(() => startOfDay(today), [today])
  const todayEnd = useMemo(() => endOfDay(today), [today])

  const { dueToday, overdue, urgent, pinned, planned, available } = useMemo(() => {
    const dueToday: Note[] = []
    const overdue: Note[] = []
    const urgent: Note[] = []
    const pinned: Note[] = []
    const planned: Note[] = []
    const available: Note[] = []

    for (const t of tasks) {
      if (t.urgent === 1) urgent.push(t)
      if (t.pinned === 1) pinned.push(t)

      if (t.due_at) {
        const due = new Date(t.due_at)
        if (due < todayStart) overdue.push(t)
        else if (due >= todayStart && due <= todayEnd) dueToday.push(t)
        else available.push(t)
      } else {
        available.push(t)
      }
    }

    const plannedIds = new Set([...overdue, ...dueToday].map((t) => t.id))
    for (const t of tasks) {
      if (plannedIds.has(t.id)) planned.push(t)
    }

    return { dueToday, overdue, urgent, pinned, planned, available }
  }, [tasks, todayEnd, todayStart])

  async function setTaskDone(id: string, next: 'open' | 'done') {
    await updateNote(id, { status: next })
    await load()
  }

  async function planForToday(id: string) {
    const due = new Date()
    due.setHours(18, 0, 0, 0)
    await updateNote(id, { due_at: due.toISOString() })
    await load()
  }

  async function duplicateToTomorrow(task: Note) {
    const base = task.due_at ? new Date(task.due_at) : new Date()
    const nextDue = addDays(base, 1)
    const id = await createNote({
      type: 'task',
      title: task.title,
      content: task.content || '',
      tags: task.tags || [],
      due_at: task.due_at ? nextDue.toISOString() : endOfDay(nextDue).toISOString(),
    })
    await updateNote(id, { priority: task.priority, urgent: task.urgent })
    await load()
  }

  function projectLabel(task: Note) {
    if (!task.project_id) return 'Standalone'
    return projectMap[task.project_id] ? `Project: ${projectMap[task.project_id]}` : 'Project task'
  }

  function Section(props: { title: string; items: Note[]; empty: string }) {
    return (
      <div className="border rounded p-4">
        <div className="font-semibold">{props.title}</div>
        <div className="mt-3 space-y-2">
          {props.items.length === 0 && <div className="text-sm opacity-60">{props.empty}</div>}
          {props.items.map((t) => (
            <div
              key={t.id}
              className="border rounded p-3 flex items-center gap-3 hover:bg-white/5"
            >
              <button
                className={`border rounded px-2 py-1 text-xs ${
                  t.status === 'done' ? 'bg-white/15 border-white/30' : 'hover:bg-white/10'
                }`}
                onClick={() => setTaskDone(t.id, t.status === 'done' ? 'open' : 'done')}
                title="Toggle done"
              >
                {t.status === 'done' ? 'Done' : 'Open'}
              </button>
              <div className="min-w-0 flex-1">
                <div
                  className="font-medium truncate cursor-pointer"
                  onClick={() => router.push(`/note/${t.id}?from=today`)}
                >
                  {t.title}
                </div>
                {t.due_at && (
                  <div className="text-xs opacity-70">
                    Due {new Date(t.due_at).toLocaleString()}
                  </div>
                )}
                <div className="text-xs opacity-60">{projectLabel(t)}</div>
              </div>
              <button
                className="border rounded px-2 py-1 text-xs hover:bg-white/10"
                onClick={() => duplicateToTomorrow(t)}
              >
                Duplicate to tomorrow
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <AppShell
      left={
        <TodaySidebar
          dueToday={dueToday}
          overdue={overdue}
          urgent={urgent}
          pinned={pinned}
          planned={planned}
        />
      }
    >
      <div className="space-y-4">
        <div className="border rounded p-4">
          <div className="text-xl font-semibold">Today</div>
          <div className="text-sm opacity-70">Focus on what matters now.</div>
        </div>

        {loading && <div className="border rounded p-4 opacity-70">Loading…</div>}

        {!loading && (
          <>
            <Section
              title="Due today"
              items={dueToday}
              empty="No tasks due today."
            />
            <Section
              title="Overdue"
              items={overdue}
              empty="Nothing overdue."
            />
            <Section
              title="Urgent"
              items={urgent}
              empty="No urgent tasks."
            />
            <Section
              title="Pinned"
              items={pinned}
              empty="No pinned tasks."
            />

            <div className="border rounded p-4">
              <div className="font-semibold">Plan for today</div>
              <div className="text-sm opacity-70">Quickly add tasks into today.</div>
              <div className="mt-3 space-y-2">
                {available.length === 0 && (
                  <div className="text-sm opacity-60">No available tasks.</div>
                )}
                {available.map((t) => (
                  <div
                    key={t.id}
                    className="border rounded p-3 flex items-center gap-3 hover:bg-white/5"
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className="font-medium truncate cursor-pointer"
                        onClick={() => router.push(`/note/${t.id}?from=today`)}
                      >
                        {t.title}
                      </div>
                      <div className="text-xs opacity-60">
                        {t.due_at ? `Due ${new Date(t.due_at).toLocaleString()}` : 'No due date'}
                      </div>
                      <div className="text-xs opacity-60">{projectLabel(t)}</div>
                    </div>
                    <button
                      className="border rounded px-2 py-1 text-xs hover:bg-white/10"
                      onClick={() => planForToday(t.id)}
                    >
                      Add to today
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
