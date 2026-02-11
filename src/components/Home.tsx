'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { Note, NoteStatus, NoteType } from '../lib/types'
import { createNote, listNotes } from '../lib/repo'

const TYPES: { label: string; value: NoteType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Ideas', value: 'idea' },
  { label: 'Projects', value: 'project' },
  { label: 'Tasks', value: 'task' },
  { label: 'Lists', value: 'list' },
  { label: 'Files', value: 'file' },
]

const STATUSES: { label: string; value: NoteStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Done', value: 'done' },
  { label: 'Archived', value: 'archived' },
]

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([])
  const [type, setType] = useState<NoteType | 'all'>('all')
  const [status, setStatus] = useState<NoteStatus | 'all'>('open')
  const [q, setQ] = useState('')

  const load = async () => {
    const rows = await listNotes({ type, status, q, projectId: 'all' })
    setNotes(rows)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return notes
    return notes.filter(n => (n.title + ' ' + n.content).toLowerCase().includes(s))
  }, [notes, q])

  async function quickCreate(t: NoteType) {
    const title =
      t === 'idea' ? 'New idea' :
      t === 'project' ? 'New project' :
      t === 'task' ? 'New task' :
      t === 'list' ? 'New list' :
      'New file note'

    const id = await createNote({ type: t, title })
    // go to the editor
    window.location.href = `/note?id=${id}`
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold">Mektoub — Notes MVP</h1>
        <p className="text-sm opacity-70 mt-1">Offline-first. Stored locally in your browser.</p>

        <div className="mt-6 flex flex-wrap gap-3 items-center">
          <input
            className="border rounded px-3 py-2 w-72"
            placeholder="Search..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />

          <select className="border rounded px-3 py-2" value={type} onChange={(e) => setType(e.target.value as any)}>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <select className="border rounded px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value as any)}>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <button className="border rounded px-3 py-2" onClick={load}>Refresh</button>

          <div className="ml-auto flex flex-wrap gap-2">
            <button className="bg-black text-white rounded px-3 py-2" onClick={() => quickCreate('idea')}>+ Idea</button>
            <button className="bg-black text-white rounded px-3 py-2" onClick={() => quickCreate('project')}>+ Project</button>
            <button className="bg-black text-white rounded px-3 py-2" onClick={() => quickCreate('task')}>+ Task</button>
            <button className="bg-black text-white rounded px-3 py-2" onClick={() => quickCreate('list')}>+ List</button>
            <button className="bg-black text-white rounded px-3 py-2" onClick={() => quickCreate('file')}>+ File</button>
          </div>
        </div>

        <div className="mt-6 border rounded">
          {filtered.length === 0 ? (
            <div className="p-6 opacity-70">No notes yet. Create one above.</div>
          ) : (
            <ul>
              {filtered.map(n => (
                <li key={n.id} className="border-b last:border-b-0">
                  <Link href={`/note?id=${n.id}`} className="block p-4 hover:bg-white/5 hover:border-white/20 border border-transparent">
 
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2 py-1 rounded bg-gray-100">{n.type}</span>
                      <span className="font-semibold">{n.title}</span>
                      <span className="ml-auto text-xs opacity-70">{new Date(n.updated_at).toLocaleString()}</span>
                    </div>
                    {n.content?.trim() ? (
                      <div className="text-sm opacity-70 mt-1 line-clamp-2">
                        {n.content}
                      </div>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
