'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Note, ProjectNodeRow } from '../../lib/types'
import { listNotes, getProjectTree } from '../../lib/repo'

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
    return [...projects].sort((a, b) => b.project.updated_at.localeCompare(a.project.updated_at))
  }, [projects])

  if (loading) return <div className="border rounded p-4 opacity-70">Loading projects…</div>

  if (sorted.length === 0) return null

  return (
    <div className="border rounded p-4">
      <div className="font-semibold">Projects</div>

      <div className="mt-3 space-y-2">
        {sorted.map((b) => {
          const isOpen = expanded.has(b.project.id)
          const stats = countTasks(b)

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
                </div>

                <div className="ml-auto text-sm underline opacity-80 hover:opacity-100"
                     onClick={(e) => { e.stopPropagation(); window.location.href = `/note/${b.project.id}` }}>
                  open
                </div>
              </button>

              {isOpen ? (
                <div className="px-3 pb-3">
                  <ProjectTreeInline projectId={b.project.id} nodes={b.nodes} taskNotesById={b.taskNotesById} />
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
            <button
              key={n.id}
              style={{ paddingLeft: pad }}
              className="w-full text-left text-sm border rounded px-2 py-2 hover:bg-white/10"
              onClick={() => (window.location.href = `/note/${note.id}`)}
            >
              ✅ {note.title}
              {note.status !== 'open' ? <span className="opacity-70"> ({note.status})</span> : null}
            </button>
          )
        })}
      </div>
    )
  }

  return <div className="mt-2">{render('__root__', 0)}</div>
}
