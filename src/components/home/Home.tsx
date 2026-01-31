'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Notebook, Note, NoteStatus, NoteType } from '../../lib/types'
import {
  createNotebook,
  createNote,
  deleteNotebook,
  listNotebooks,
  listNotes,
  renameNotebook,
  setPinned,
} from '../../lib/repo'
import FiltersBar from './FiltersBar'
import NoteCard from './NoteCard'

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

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [notebookId, setNotebookId] = useState<string | 'all' | 'none'>('all')

  const [q, setQ] = useState('')
  const [type, setType] = useState<NoteType | 'all'>('all')
  const [status, setStatus] = useState<NoteStatus | 'all'>('open')
  const [urgentOnly, setUrgentOnly] = useState(false)
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  async function refreshNotebooks() {
    const nbs = await listNotebooks()
    setNotebooks(nbs)
  }

  async function refreshNotes() {
    setLoading(true)
    const res = await listNotes({ q, type, status, notebookId })
    const afterUrgent = urgentOnly ? res.filter((n) => n.urgent === 1) : res
    const afterTag = tagFilter
      ? afterUrgent.filter((n) => (n.tags ?? []).includes(tagFilter))
      : afterUrgent

    setNotes(afterTag)
    setLoading(false)
  }

  useEffect(() => {
    refreshNotebooks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    refreshNotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type, status, urgentOnly, tagFilter, notebookId])

  const sidebarItems = useMemo(() => {
    return [
      { id: 'all' as const, label: 'All notes' },
      { id: 'none' as const, label: 'No notebook' },
    ]
  }, [])

  async function onCreate(t: NoteType) {
    const id = await createNote({
      type: t,
      title: 'Title',
      content: '',
      tags: [],
      notebook_id: notebookId !== 'all' && notebookId !== 'none' ? notebookId : null,
    })
    window.location.href = `/note/${id}`
  }

  async function onCreateNotebook() {
    const name = prompt('Notebook name?')
    if (!name) return
    try {
      await createNotebook(name)
      await refreshNotebooks()
    } catch (e: any) {
      alert(e?.message ?? 'Failed to create notebook')
    }
  }

  async function onRenameNotebook(nb: Notebook) {
    const name = prompt('Rename notebook:', nb.name)
    if (!name) return
    try {
      await renameNotebook(nb.id, name)
      await refreshNotebooks()
    } catch (e: any) {
      alert(e?.message ?? 'Failed to rename notebook')
    }
  }

  async function onDeleteNotebook(nb: Notebook) {
    if (!confirm(`Delete notebook "${nb.name}"?\nNotes will remain, but will be moved to "No notebook".`)) return
    try {
      await deleteNotebook(nb.id)
      // if we were viewing it, go back to All
      setNotebookId((cur) => (cur === nb.id ? 'all' : cur))
      await refreshNotebooks()
      await refreshNotes()
    } catch (e: any) {
      alert(e?.message ?? 'Failed to delete notebook')
    }
  }

  const topTags = useMemo(() => collectTopTags(notes), [notes])

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
        {/* Sidebar */}
        <aside className="border rounded p-3 h-fit md:sticky md:top-6">
          <div className="flex items-center gap-2">
            <div className="font-semibold">Notebooks</div>
            <button className="ml-auto border rounded px-2 py-1 text-sm" onClick={onCreateNotebook}>
              + Notebook
            </button>
          </div>

          <div className="mt-3 space-y-1">
            {sidebarItems.map((it) => (
              <button
                key={it.id}
                className={`w-full text-left px-3 py-2 rounded border ${
                  notebookId === it.id ? 'bg-white/15 border-white/20' : 'border-transparent hover:bg-white/10'
                }`}
                onClick={() => setNotebookId(it.id)}
              >
                {it.label}
              </button>
            ))}

            <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
              {notebooks.map((nb) => {
                const active = notebookId === nb.id
                return (
                  <div key={nb.id} className="flex items-center gap-2">
                    <button
                      className={`flex-1 text-left px-3 py-2 rounded border ${
                        active ? 'bg-white/15 border-white/20' : 'border-transparent hover:bg-white/10'
                      }`}
                      onClick={() => setNotebookId(nb.id)}
                      title={nb.name}
                    >
                      <span className="truncate block">{nb.name}</span>
                    </button>

                    <button
                      className="border rounded px-2 py-2 text-sm hover:bg-white/10"
                      title="Rename"
                      onClick={() => onRenameNotebook(nb)}
                    >
                      ✏️
                    </button>
                    <button
                      className="border rounded px-2 py-2 text-sm hover:bg-white/10"
                      title="Delete"
                      onClick={() => onDeleteNotebook(nb)}
                    >
                      🗑️
                    </button>
                  </div>
                )
              })}
              {notebooks.length === 0 && (
                <div className="text-sm opacity-70 px-1 pt-1">No notebooks yet.</div>
              )}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="space-y-4">
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
                    notebook_id: notebookId !== 'all' && notebookId !== 'none' ? notebookId : null,
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

          {/* Tag chips */}
          {topTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {topTags.map((t) => {
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
          )}

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
                    await refreshNotes()
                  }}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
