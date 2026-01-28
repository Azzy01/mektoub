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
  const [urgentOnly, setUrgentOnly] = useState(false)
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    
    const res = await listNotes({ q, type, status })
    const filtered = urgentOnly ? res.filter(n => n.urgent === 1) : res
    setNotes(filtered)    
    setLoading(false)

    const afterUrgent = urgentOnly ? res.filter((n) => n.urgent === 1) : res
    const afterTag = tagFilter ? afterUrgent.filter((n) => (n.tags ?? []).includes(tagFilter)) : afterUrgent
    setNotes(afterTag)

  }

  function collectTopTags(ns: Note[]) {
    const freq = new Map<string, number>()
    for (const n of ns) {
      for (const t of n.tags ?? []) {
        freq.set(t, (freq.get(t) ?? 0) + 1)
      }
    }
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([t]) => t)
  }

  
  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type, status, urgentOnly, tagFilter])

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

       

        <FiltersBar
        q={q}
        setQ={setQ}
        type={type}
        setType={setType}
        status={status}
        setStatus={setStatus}
        urgentOnly={urgentOnly}
        setUrgentOnly={setUrgentOnly}
        />

        {(() => {
        const baseList = notes // these are already filtered; good for “contextual tags”
        const tags = collectTopTags(baseList)

        if (tags.length === 0) return null

        return (
            <div className="flex flex-wrap gap-2">
            {tags.map((t) => {
                const active = tagFilter === t
                return (
                <button
                    key={t}
                    className={`text-xs px-2 py-1 rounded border ${
                    active ? 'bg-white/20 border-white/30' : 'bg-white/10 border-white/10 hover:bg-white/15'
                    }`}
                    onClick={() => setTagFilter(active ? null : t)}
                >
                    #{t}
                </button>
                )
            })}

            {tagFilter && (
                <button
                className="text-xs px-2 py-1 rounded border bg-white/10 border-white/10 hover:bg-white/15 opacity-80"
                onClick={() => setTagFilter(null)}
                title="Clear tag filter"
                >
                Clear
                </button>
            )}
            </div>
        )
        })()}



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
