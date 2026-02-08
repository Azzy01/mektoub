'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Note } from '../../lib/types'
import { getProjectTree, listNotes } from '../../lib/repo'

export default function ProjectsSidebar() {
  const [projects, setProjects] = useState<Note[]>([])
  const [stats, setStats] = useState<Record<string, { done: number; total: number }>>({})
  const router = useRouter()
  const search = useSearchParams()
  const statusFilter = search.get('status') || 'all'

  async function refresh() {
    const ps = await listNotes({ type: 'project', status: 'all' })
    setProjects(ps)
    const bundles = await Promise.all(
      ps.map(async (p) => {
        const tree = await getProjectTree(p.id)
        const taskIds = tree.nodes.filter((n) => n.kind === 'task' && n.note_id).map((n) => n.note_id as string)
        let done = 0
        for (const id of taskIds) {
          if (tree.taskNotesById[id]?.status === 'done') done++
        }
        return [p.id, { done, total: taskIds.length }] as const
      })
    )
    const map: Record<string, { done: number; total: number }> = {}
    for (const [id, st] of bundles) map[id] = st
    setStats(map)
  }

  useEffect(() => {
    refresh()
  }, [])

  function onCreateProject() {
    router.push('/note/new?type=project')
  }

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return projects
    return projects.filter((p) => p.status === statusFilter)
  }, [projects, statusFilter])

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="font-semibold">Projects</div>
        <button className="ml-auto border rounded px-2 py-1 text-sm hover:bg-white/10" onClick={onCreateProject}>
          + Project
        </button>
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex gap-2 text-xs">
          <button
            className={`border rounded px-2 py-1 ${statusFilter === 'all' ? 'bg-white/15 border-white/30' : 'hover:bg-white/10'}`}
            onClick={() => router.push('/projects')}
          >
            All
          </button>
          <button
            className={`border rounded px-2 py-1 ${statusFilter === 'done' ? 'bg-white/15 border-white/30' : 'hover:bg-white/10'}`}
            onClick={() => router.push('/projects?status=done')}
          >
            Completed
          </button>
          <button
            className={`border rounded px-2 py-1 ${statusFilter === 'archived' ? 'bg-white/15 border-white/30' : 'hover:bg-white/10'}`}
            onClick={() => router.push('/projects?status=archived')}
          >
            Archived
          </button>
        </div>

        <div className="mt-3 space-y-1">
          {filtered.map((p) => {
            const st = stats[p.id] || { done: 0, total: 0 }
            return (
              <button
                key={p.id}
                className="w-full text-left px-3 py-2 border rounded border-white/10 hover:bg-white/10"
                onClick={() => router.push(`/note/${p.id}`)}
                title={p.title}
              >
                <div className="flex items-center gap-2">
                  <span className="truncate block flex-1">{p.title}</span>
                  <span className="text-xs opacity-70">
                    {st.done}/{st.total}
                  </span>
                </div>
              </button>
            )
          })}
          {filtered.length === 0 ? <div className="text-sm opacity-70">No projects yet.</div> : null}
        </div>
      </div>
    </div>
  )
}
