'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Note, ProjectNodeRow } from '../../lib/types'
import { createTaskInProject, getProjectTree, listNotes, updateNote } from '../../lib/repo'
import { useAuth } from '../../lib/auth'
import { syncNow } from '../../lib/sync'

type ProjectBundle = {
  project: Note
  nodes: ProjectNodeRow[]
  taskNotesById: Record<string, Note>
}

function countTasks(bundle: ProjectBundle) {
  const taskIds = bundle.nodes.filter(n => n.kind === 'task' && n.note_id).map(n => n.note_id as string)
  let done = 0
  for (const id of taskIds) {
    const note = bundle.taskNotesById[id]
    if (note?.status === 'done') done++
  }
  return { total: taskIds.length, done }
}

function getProjectStats(bundle: ProjectBundle) {
  const tasks = Object.values(bundle.taskNotesById)
  const now = new Date()
  let overdue = 0
  let nextDue: Date | null = null
  let lastActivity: Date | null = bundle.project.updated_at ? new Date(bundle.project.updated_at) : null
  const tagCounts = new Map<string, number>()

  for (const t of tasks) {
    if (t.updated_at) {
      const d = new Date(t.updated_at)
      if (!lastActivity || d > lastActivity) lastActivity = d
    }
    if (t.status === 'open' && t.due_at) {
      const due = new Date(t.due_at)
      if (due < now) overdue++
      else if (!nextDue || due < nextDue) nextDue = due
    }
    for (const tag of t.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    }
  }

  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t)

  return { overdue, nextDue, lastActivity, topTags }
}

export default function ProjectsSection() {
  const [projects, setProjects] = useState<ProjectBundle[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const search = useSearchParams()
  const statusFilter = search.get('status') || 'open'
  const { authed } = useAuth()
  const [quickAdd, setQuickAdd] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    await syncNow()
    // load all projects
    const ps = await listNotes({ type: 'project', status: 'all', includePrivate: authed })

    // load trees in parallel
    const bundles: ProjectBundle[] = await Promise.all(
      ps.map(async (p) => {
        const tree = await getProjectTree(p.id)
        if (!authed) {
          const filteredNotes: Record<string, Note> = {}
          const privateIds = new Set<string>()
          for (const [id, note] of Object.entries(tree.taskNotesById)) {
            if (note.is_private === 1) privateIds.add(id)
            else filteredNotes[id] = note
          }
          const filteredNodes = tree.nodes.filter((n) => !n.note_id || !privateIds.has(n.note_id))
          return { project: p, nodes: filteredNodes, taskNotesById: filteredNotes }
        }
        return { project: p, nodes: tree.nodes, taskNotesById: tree.taskNotesById }
      })
    )

    setProjects(bundles)
    setLoading(false)
  }, [authed])

  useEffect(() => {
    void load()
  }, [load])

  const sorted = useMemo(() => {
    const filtered = statusFilter === 'all'
      ? projects
      : projects.filter((p) => p.project.status === statusFilter)
    return [...filtered].sort((a, b) => b.project.updated_at.localeCompare(a.project.updated_at))
  }, [projects, statusFilter])

  if (loading) return <div className="border rounded p-4 opacity-70">Loading projects…</div>

  if (sorted.length === 0) return null

  return (
    <div className="border rounded p-4">
      <div className="font-semibold">Projects</div>

      <div className="mt-3 space-y-2">
        {sorted.map((b) => {
          const isOpen = expanded.has(b.project.id)
          const stats = countTasks(b)
          const overview = getProjectStats(b)
          const preview =
            b.project.content
              .split('\n')
              .map((l) => l.trim())
              .find((l) => l.length > 0) || ''

          return (
            <div key={b.project.id} className="border rounded">
              <button
                className="w-full text-left px-3 py-3 flex items-center gap-3 hover:bg-white/10"
                onClick={() => {
                  setExpanded(prev => {
                    const next = new Set(prev)
                    if (next.has(b.project.id)) next.delete(b.project.id)
                    else next.add(b.project.id)
                    return next
                  })
                }}
              >
                <span className="w-6 text-center">{isOpen ? '▼' : '▶'}</span>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{b.project.title}</div>
                  <div className="text-xs opacity-70">
                    {stats.done}/{stats.total} done
                  </div>
                  <div className="mt-1 h-1.5 w-44 bg-white/10 rounded overflow-hidden">
                    <div
                      className="h-full bg-white/40"
                      style={{
                        width: stats.total === 0 ? '0%' : `${Math.round((stats.done / stats.total) * 100)}%`,
                      }}
                    />
                  </div>
                  {preview && <div className="text-xs opacity-60 truncate mt-1">{preview}</div>}
                  <div className="mt-2 text-xs opacity-70 flex flex-wrap gap-2">
                    <span>Overdue: {overview.overdue}</span>
                    <span>
                      Next due:{' '}
                      {overview.nextDue ? new Date(overview.nextDue).toLocaleDateString() : '—'}
                    </span>
                    <span>
                      Last activity:{' '}
                      {overview.lastActivity ? new Date(overview.lastActivity).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  {overview.topTags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      {overview.topTags.map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded border border-white/10 bg-white/10">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {b.project.is_private === 1 && (
                  <span className="text-xs px-2 py-1 rounded border border-purple-400/30 bg-purple-500/20 text-purple-100">
                    🔒 Private
                  </span>
                )}

                <div className="ml-auto flex items-center gap-2">
                  <select
                    className="border rounded px-2 py-1 text-xs bg-transparent"
                    value={b.project.status}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onChange={async (e) => {
                      e.stopPropagation()
                      await updateNote(b.project.id, { status: e.target.value as Note['status'] })
                      await syncNow()
                      await load()
                    }}
                  >
                    <option value="open">open</option>
                    <option value="done">done</option>
                    <option value="archived">archived</option>
                  </select>
                  <div
                    className="text-sm underline opacity-80 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.location.href = `/note?id=${b.project.id}&from=projects`
                    }}
                  >
                    open
                  </div>
                </div>
              </button>

              {isOpen ? (
                <div className="px-3 pb-3">
                  <div className="mb-3 flex items-center gap-2">
                    <input
                      className="flex-1 border rounded px-3 py-2 bg-transparent text-sm"
                      placeholder="Quick add task..."
                      value={quickAdd[b.project.id] || ''}
                      onChange={(e) =>
                        setQuickAdd((prev) => ({ ...prev, [b.project.id]: e.target.value }))
                      }
                      onKeyDown={async (e) => {
                        if (e.key !== 'Enter') return
                        const title = (quickAdd[b.project.id] || '').trim()
                        if (!title) return
                        await createTaskInProject({ projectId: b.project.id, title })
                        await syncNow()
                        setQuickAdd((prev) => ({ ...prev, [b.project.id]: '' }))
                        await load()
                      }}
                    />
                    <button
                      className="border rounded px-3 py-2 text-sm hover:bg-white/10"
                      onClick={async () => {
                        const title = (quickAdd[b.project.id] || '').trim()
                        if (!title) return
                        await createTaskInProject({ projectId: b.project.id, title })
                        await syncNow()
                        setQuickAdd((prev) => ({ ...prev, [b.project.id]: '' }))
                        await load()
                      }}
                    >
                      Add
                    </button>
                  </div>
                  <ProjectTreeInline
                    projectId={b.project.id}
                    nodes={b.nodes}
                    taskNotesById={b.taskNotesById}
                    onStatusChange={async (id, nextStatus) => {
                      await updateNote(id, { status: nextStatus })
                      await syncNow()
                      await load()
                    }}
                  />
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ProjectTreeInline(props: {
  projectId: string
  nodes: ProjectNodeRow[]
  taskNotesById: Record<string, Note>
  onStatusChange: (id: string, nextStatus: Note['status']) => Promise<void>
}) {
  // minimal inline view: show only tasks grouped by group titles (1 level)
  const byParent = new Map<string, ProjectNodeRow[]>()
  for (const n of props.nodes) {
    const key = n.parent_id ?? '__root__'
    const arr = byParent.get(key) ?? []
    arr.push(n)
    byParent.set(key, arr)
  }
  for (const [k, arr] of byParent.entries()) {
    arr.sort((a, b) => (a.sort_order - b.sort_order) || a.created_at.localeCompare(b.created_at))
    byParent.set(k, arr)
  }

  function renderTasks(tasks: Note[]) {
    return (
      <div className="space-y-1">
        {tasks.map((note) => (
          <div
            key={note.id}
            className="w-full text-sm border rounded px-2 py-2 hover:bg-white/10 flex items-center gap-2"
          >
            <div className="flex-1 min-w-0">
              <button
                className="text-left w-full truncate"
                onClick={() => (window.location.href = `/note?id=${note.id}&from=projects`)}
              >
                {note.status === 'done' ? '✅' : '▫️'} {note.title}
              </button>
            </div>
            <button
              className={`border rounded px-2 py-1 text-xs ${
                note.status === 'done' ? 'bg-white/15 border-white/30' : 'hover:bg-white/10'
              }`}
              onClick={async (e) => {
                e.stopPropagation()
                const next = note.status === 'done' ? 'open' : 'done'
                await props.onStatusChange(note.id, next)
              }}
              title="Toggle done"
            >
              {note.status === 'done' ? 'Done' : 'Open'}
            </button>
          </div>
        ))}
      </div>
    )
  }

  function render(parentKey: string, level: number) {
    const arr = byParent.get(parentKey) ?? []
    return (
      <div className="space-y-1">
        {arr.map((n) => {
          const pad = 8 + level * 16
          if (n.kind === 'group') {
            return (
              <div key={n.id} style={{ paddingLeft: pad }} className="mt-2">
                <div className="text-sm font-semibold opacity-90">📁 {n.title}</div>
                {render(n.id, level + 1)}
              </div>
            )
          }
          const note = n.note_id ? props.taskNotesById[n.note_id] : null
          if (!note) return null
          return (
            <div key={n.id} style={{ paddingLeft: pad }}>
              {renderTasks([note])}
            </div>
          )
        })}
      </div>
    )
  }

  const rootTasks = (byParent.get('__root__') ?? [])
    .filter((n) => n.kind === 'task' && n.note_id && props.taskNotesById[n.note_id])
    .map((n) => props.taskNotesById[n.note_id as string])

  const byPriority = (tasks: Note[]) => ({
    p1: tasks.filter((t) => (t.priority ?? 3) === 1),
    p2: tasks.filter((t) => (t.priority ?? 3) === 2),
    p3: tasks.filter((t) => (t.priority ?? 3) >= 3),
  })

  const lanes = byPriority(rootTasks)

  return (
    <div className="mt-2 space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="border rounded p-2">
          <div className="text-xs opacity-70 mb-2">P1</div>
          {lanes.p1.length ? renderTasks(lanes.p1) : <div className="text-xs opacity-60">No tasks</div>}
        </div>
        <div className="border rounded p-2">
          <div className="text-xs opacity-70 mb-2">P2</div>
          {lanes.p2.length ? renderTasks(lanes.p2) : <div className="text-xs opacity-60">No tasks</div>}
        </div>
        <div className="border rounded p-2">
          <div className="text-xs opacity-70 mb-2">P3+</div>
          {lanes.p3.length ? renderTasks(lanes.p3) : <div className="text-xs opacity-60">No tasks</div>}
        </div>
      </div>

      {render('__root__', 0)}
    </div>
  )
}
