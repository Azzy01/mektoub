'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Note, NoteStatus } from '../../lib/types'
import { getNote, updateNote } from '../../lib/repo'
import { syncNow } from '../../lib/sync'
import TagsEditor from '../note/TagsEditor'
import { normTags } from '../note/utils'

type NotePatch = Partial<
  Pick<Note, 'title' | 'content' | 'status' | 'due_at' | 'tags' | 'priority' | 'urgent'>
>

export default function TaskModal(props: {
  open: boolean
  noteId: string | null
  onClose: () => void
  onSaved: () => Promise<void> | void
  onDelete?: (noteId: string) => Promise<void> // optional: delete task note
}) {
  const [note, setNote] = useState<Note | null>(null)
  const [draft, setDraft] = useState<NotePatch>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCal, setShowCal] = useState(false)
  const [calMonth, setCalMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))

  const days = useMemo(() => {
    const first = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1)
    const last = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0)
    const start = new Date(first)
    const startOffset = (first.getDay() + 6) % 7
    start.setDate(first.getDate() - startOffset)
    const end = new Date(last)
    const endOffset = (last.getDay() + 6) % 7
    end.setDate(last.getDate() + (6 - endOffset))
    const arr: Date[] = []
    const cur = new Date(start)
    while (cur <= end) {
      arr.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }
    return arr
  }, [calMonth])

  useEffect(() => {
    if (!props.open || !props.noteId) return
    ;(async () => {
      setLoading(true)
      setError(null)
      const n = await getNote(props.noteId!)
      setNote(n)
      setDraft(
        n
          ? {
              title: n.title,
              content: n.content,
              status: n.status,
              due_at: n.due_at,
              tags: n.tags ?? [],
              priority: (n as any).priority ?? 3,
              urgent: (n as any).urgent ?? 0,
            }
          : {}
      )
      setLoading(false)
    })()
  }, [props.open, props.noteId])

  const dirty = useMemo(() => {
    if (!note) return false
    const a = {
      title: (draft.title ?? '') as string,
      content: (draft.content ?? '') as string,
      status: (draft.status ?? 'open') as NoteStatus,
      due_at: (draft.due_at ?? null) as string | null,
      tags: normTags(draft.tags as any),
      priority: (draft.priority ?? 3) as number,
      urgent: (draft.urgent ?? 0) as number,
    }
    const b = {
      title: note.title,
      content: note.content,
      status: note.status,
      due_at: note.due_at ?? null,
      tags: normTags(note.tags),
      priority: (note as any).priority ?? 3,
      urgent: (note as any).urgent ?? 0,
    }
    return JSON.stringify(a) !== JSON.stringify(b)
  }, [draft, note])

  if (!props.open) return null

  function syncInBackground() {
    void syncNow().catch(() => {
      // Ignore sync errors in local-first modal flow.
    })
  }

  async function save() {
    if (!note) return
    setSaving(true)
    setError(null)
    try {
      const patch: NotePatch = {
        title: (draft.title ?? '').trim() || '(Untitled)',
        content: draft.content ?? '',
        status: (draft.status ?? 'open') as NoteStatus,
        due_at: draft.due_at ?? null,
        tags: normTags(draft.tags as any),
        priority: Number(draft.priority ?? 3),
        urgent: (draft.urgent ?? 0) as 0 | 1,
      }
      await updateNote(note.id, patch)
      await props.onSaved()
      syncInBackground()
      props.onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function tryClose() {
    if (dirty && !confirm('You have unsaved changes. Close without saving?')) return
    props.onClose()
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={tryClose} />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl border rounded bg-[var(--background)] text-[var(--foreground)] p-4 shadow-lg max-h-[85vh] overflow-auto">
          <div className="flex items-center gap-2">
            <div className="font-semibold">Edit Task</div>
            <div className="ml-auto text-xs opacity-70">
              {saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'Saved'}
            </div>
            <button className="border rounded px-2 py-1 text-sm hover:bg-white/10" onClick={tryClose}>
              ✕
            </button>
          </div>

          {loading ? (
            <div className="mt-4 opacity-70">Loading…</div>
          ) : !note ? (
            <div className="mt-4 text-sm border border-red-400/40 bg-red-500/10 text-red-200 rounded p-2">
              Task not found
            </div>
          ) : (
            <>
              {error ? (
                <div className="mt-3 text-sm border border-red-400/40 bg-red-500/10 text-red-200 rounded p-2">
                  {error}
                </div>
              ) : null}

              {/* Title */}
              <div className="mt-4">
                <label className="text-xs opacity-70">Title</label>
                <input
                  className="mt-1 w-full border rounded px-3 py-2"
                  value={draft.title ?? ''}
                  placeholder="Task title"
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                />
              </div>

              {/* Row: status / due / priority / urgent */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs opacity-70">Status</label>
                  <select
                    className="mt-1 w-full border rounded px-3 py-2"
                    value={(draft.status ?? 'open') as string}
                    onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as NoteStatus }))}
                  >
                    <option value="open">open</option>
                    <option value="done">done</option>
                    <option value="archived">archived</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs opacity-70">Due</label>
                  <div className="relative mt-1">
                    <button
                      className="w-full border rounded px-3 py-2 text-sm text-left hover:bg-white/5"
                      onClick={() => setShowCal((v) => !v)}
                      type="button"
                    >
                      {draft.due_at ? new Date(draft.due_at).toLocaleDateString() : 'No due date'}
                    </button>
                    <button
                      className="ml-2 border rounded px-2 py-1 text-xs hover:bg-white/5"
                      type="button"
                      onClick={() => {
                        setDraft((d) => ({ ...d, due_at: null }))
                        setShowCal(false)
                      }}
                    >
                      Clear
                    </button>
                    {showCal && (
                      <div className="absolute z-20 mt-2 panel p-3 w-72">
                        <div className="flex items-center gap-2 mb-2">
                          <button
                            className="border rounded px-2 py-1 text-xs hover:bg-white/10"
                            onClick={() =>
                              setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))
                            }
                          >
                            ←
                          </button>
                          <div className="flex-1 text-center text-sm font-medium">
                            {calMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                          </div>
                          <button
                            className="border rounded px-2 py-1 text-xs hover:bg-white/10"
                            onClick={() =>
                              setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))
                            }
                          >
                            →
                          </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-xs text-center opacity-70 mb-1">
                          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
                            <div key={d}>{d}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-xs">
                          {days.map((d) => {
                            const isCurrentMonth = d.getMonth() === calMonth.getMonth()
                            const isSelected =
                              draft.due_at && new Date(draft.due_at).toDateString() === d.toDateString()
                            return (
                              <button
                                key={d.toISOString()}
                                className={`rounded px-2 py-1 ${
                                  isSelected
                                    ? 'bg-white/20 border border-white/30'
                                    : 'border border-white/10 hover:bg-white/10'
                                } ${isCurrentMonth ? '' : 'opacity-40'}`}
                                onClick={() => {
                                  const due = new Date(d)
                                  due.setHours(18, 0, 0, 0)
                                  setDraft((prev) => ({ ...prev, due_at: due.toISOString() }))
                                  setShowCal(false)
                                }}
                              >
                                {d.getDate()}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs opacity-70">Priority</label>
                  <select
                    className="mt-1 w-full border rounded px-3 py-2"
                    value={String(draft.priority ?? 3)}
                    onChange={(e) => setDraft((d) => ({ ...d, priority: Number(e.target.value) }))}
                  >
                    <option value="1">1 (high)</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5 (low)</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <input
                  id="urgent"
                  type="checkbox"
                  checked={(draft.urgent ?? 0) === 1}
                  onChange={(e) => setDraft((d) => ({ ...d, urgent: e.target.checked ? 1 : 0 }))}
                />
                <label htmlFor="urgent" className="text-sm">
                  Urgent
                </label>
              </div>

              {/* Tags */}
              <div className="mt-4">
                <label className="text-xs opacity-70">Tags</label>
                <TagsEditor
                  tags={normTags((draft.tags as any) ?? [])}
                  onChange={(next) => setDraft((d) => ({ ...d, tags: next }))}
                />
              </div>

              {/* Content */}
              <div className="mt-4">
                <label className="text-xs opacity-70">Content</label>
                <textarea
                  className="mt-1 w-full border rounded px-3 py-2 min-h-[180px]"
                  placeholder="Details..."
                  value={draft.content ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                />
              </div>

              {/* Buttons */}
              <div className="mt-4 flex gap-2">
                {props.onDelete && note ? (
                  <button
                    className="border rounded px-3 py-2 hover:bg-white/10"
                    onClick={async () => {
                      if (!confirm('Delete this task?')) return
                      await props.onDelete!(note.id)
                      await props.onSaved()
                      props.onClose()
                    }}
                  >
                    Delete
                  </button>
                ) : null}

                <button className="ml-auto border rounded px-3 py-2 hover:bg-white/10" onClick={tryClose} disabled={saving}>
                  Cancel
                </button>
                <button
                  className="border rounded px-3 py-2 disabled:opacity-50 hover:bg-white/10"
                  onClick={save}
                  disabled={!dirty || saving}
                >
                  Save
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
