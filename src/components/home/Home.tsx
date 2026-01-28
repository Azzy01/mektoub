'use client'

import { useEffect, useState } from 'react'
import type { Note, NoteStatus, NoteType } from '../../lib/types'
import { createNote, listNotes, setPinned } from '../../lib/repo'
import FiltersBar from './FiltersBar'
import NoteCard from './NoteCard'

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  const [q, setQ] = useState('')
  const [type, setType] = useState<NoteType | 'all'>('all')
  const [status, setStatus] = useState<NoteStatus | 'all'>('open') // ✅ default to open

  async function refresh() {
    setLoading(true)
    const res = await listNotes({ q, type, status })
    setNotes(res)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type, status])

  async function onCreate(t: NoteType) {
    const id = await createNote({
      type: t,
      title: 'Title',
      content: '',
      tags: [],
    })
    window.location.href = `/note/${id}`
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Mektoub</h1>

          <div className="ml-auto flex flex-wrap gap-2">
          <button
            className="border rounded px-3 py-2"
            onClick={async () => {
            const id = await createNote({
                type: 'idea',
                title: 'Quick note',
                content: '',
                tags: ['quick'],
            })
            window.location.href = `/note/${id}`
            }}
        >
            ⚡ Quick
        </button>
            
            <button className="border rounded px-3 py-2" onClick={() => onCreate('idea')}>
              + Idea
            </button>
            <button className="border rounded px-3 py-2" onClick={() => onCreate('project')}>
              + Project
            </button>
            <button className="border rounded px-3 py-2" onClick={() => onCreate('task')}>
              + Task
            </button>
            <button className="border rounded px-3 py-2" onClick={() => onCreate('list')}>
              + List
            </button>
            <button className="border rounded px-3 py-2" onClick={() => onCreate('file')}>
              + File note
            </button>
          </div>
        </div>

        <FiltersBar q={q} setQ={setQ} type={type} setType={setType} status={status} setStatus={setStatus} />

        {loading ? (
          <div className="opacity-70">Loading…</div>
        ) : notes.length === 0 ? (
          <div className="opacity-70">No notes yet.</div>
        ) : (
          <div className="space-y-2">
            {notes.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                onTogglePin={async (id, nextPinned) => {
                  await setPinned(id, nextPinned)
                  await refresh()
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
