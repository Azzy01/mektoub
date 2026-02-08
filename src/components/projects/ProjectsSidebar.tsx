'use client'

import { useEffect, useState } from 'react'
import type { Note } from '../../lib/types'
import { createNote, listNotes } from '../../lib/repo'

export default function ProjectsSidebar() {
  const [projects, setProjects] = useState<Note[]>([])

  async function refresh() {
    setProjects(await listNotes({ type: 'project', status: 'all' }))
  }

  useEffect(() => {
    refresh()
  }, [])

  async function onCreateProject() {
    const title = prompt('Project name?')
    if (!title) return
    const id = await createNote({ type: 'project', title, content: '', tags: [] })
    window.location.href = `/note/${id}` // later we can do /projects/[id]
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="font-semibold">Projects</div>
        <button className="ml-auto border rounded px-2 py-1 text-sm hover:bg-white/10" onClick={onCreateProject}>
          + Project
        </button>
      </div>

      <div className="mt-3 space-y-1">
        {projects.map((p) => (
          <button
            key={p.id}
            className="w-full text-left px-3 py-2 border rounded border-white/10 hover:bg-white/10"
            onClick={() => (window.location.href = `/note/${p.id}`)}
            title={p.title}
          >
            <span className="truncate block">{p.title}</span>
          </button>
        ))}
        {projects.length === 0 ? <div className="text-sm opacity-70">No projects yet.</div> : null}
      </div>
    </div>
  )
}
