'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Note, ProjectNodeRow } from '../../lib/types'
import { listNotes, getProjectTree, updateNote } from '../../lib/repo'

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

export default function ProjectsSection() {
  const [projects, setProjects] = useState<ProjectBundle[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const search = useSearchParams()
  const statusFilter = search.get('status') || 'open'

  async function load() {
    setLoading(true)
    // load all projects
    const ps = await listNotes({ type: 'project', status: 'all' })

    // load trees in parallel
    const bundles: ProjectBundle[] = await Promise.all(
      ps.map(async (p) => {
        const tree = await getProjectTree(p.id)
        return { project: p, nodes: tree.nodes, taskNotesById: tree.taskNotesById }
      })
    )

    setProjects(bundles)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

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
                  {preview && <div className="text-xs opacity-60 truncate mt-1">{preview}</div>}
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <select
                    className="border rounded px-2 py-1 text-xs bg-transparent"
                    value={b.project.status}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onChange={async (e) => {
                      e.stopPropagation()
                      await updateNote(b.project.id, { status: e.target.value as Note['status'] })
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
                      window.location.href = `/note/${b.project.id}`
                    }}
                  >
                    open
                  </div>
                </div>
              </button>

              {isOpen ? (
                <div className="px-3 pb-3">
                  <ProjectTreeInline
                    projectId={b.project.id}
                    nodes={b.nodes}
                    taskNotesById={b.taskNotesById}
                    onStatusChange={async (id, nextStatus) => {
                      await updateNote(id, { status: nextStatus })
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
            <div
              key={n.id}
              style={{ paddingLeft: pad }}
              className="w-full text-sm border rounded px-2 py-2 hover:bg-white/10 flex items-center gap-2"
            >
              <div className="flex-1 min-w-0">
                <button
                  className="text-left w-full truncate"
                  onClick={() => (window.location.href = `/note/${note.id}`)}
                >
                  {note.status === 'done' ? '✅' : '▫️'} {note.title}
                </button>
              </div>
              <button
                className={`border rounded px-2 py-1 text-xs ${note.status === 'done' ? 'bg-white/15 border-white/30' : 'hover:bg-white/10'}`}
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
          )
        })}
      </div>
    )
  }

  return <div className="mt-2">{render('__root__', 0)}</div>
}
