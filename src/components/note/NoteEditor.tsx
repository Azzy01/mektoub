'use client'

import { useMemo, useState } from 'react'
import TagsEditor from './TagsEditor'
import type { Note, NoteStatus } from '../../lib/types'
import { useAuth } from '../../lib/auth'

type NotePatch = Partial<
  Pick<Note, 'title' | 'content' | 'status' | 'due_at' | 'project_id' | 'tags' | 'priority' | 'urgent'>
>

export default function NoteEditor(props: {
  note: Note
  effective: {
    title: string
    content: string
    status: NoteStatus
    due_at: string | null
    tags: string[]
    is_private: 0 | 1
    start_at?: string | null
    completed_at?: string | null
    priority?: number
    urgent?: 0 | 1
  }
  saving: boolean
  dirty: boolean
  setDraft: (updater: (d: NotePatch) => NotePatch) => void
  markDirty: () => void
  onSave: () => Promise<void>
  onCancel: () => void
  onDelete: () => Promise<void>
}) {
  const n = props.note
  const e = props.effective
  const { authed } = useAuth()
  const [showCal, setShowCal] = useState(false)
  const [calMonth, setCalMonth] = useState(() => {
    const base = e.due_at ? new Date(e.due_at) : new Date()
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })

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

  function setDueDate(d: Date | null) {
    if (!d) {
      props.setDraft((draft) => ({ ...draft, due_at: null }))
      props.markDirty()
      return
    }
    const withTime = new Date(d)
    withTime.setHours(18, 0, 0, 0)
    props.setDraft((draft) => ({ ...draft, due_at: withTime.toISOString() }))
    props.markDirty()
  }

  function prettyDue() {
    if (!e.due_at) return 'No due date'
    const d = new Date(e.due_at)
    return d.toLocaleDateString()
  }

  return (
    <div className="mt-4 border rounded p-4">
      <label className="text-xs opacity-70">Title</label>
      <input
        className="w-full border rounded px-3 py-2 mt-1"
        placeholder="Title"
        value={e.title}
        onFocus={(ev) => ev.currentTarget.select()}
        onChange={(ev) => {
          props.setDraft((d) => ({ ...d, title: ev.target.value }))
          props.markDirty()
        }}
      />

      <div className="mt-4 flex flex-wrap gap-3 items-center">
        <label className="text-xs opacity-70">Status</label>
        <select
          className="border rounded px-3 py-2"
          value={e.status}
          onChange={(ev) => {
            props.setDraft((d) => ({ ...d, status: ev.target.value as NoteStatus }))
            props.markDirty()
          }}
        >
          <option value="open">open</option>
          <option value="done">done</option>
          <option value="archived">archived</option>
        </select>

        <label className="text-xs opacity-70">Privacy</label>
        <button
          className={`border rounded px-3 py-2 text-sm ${
            e.is_private === 1 ? 'bg-white/15 border-white/30' : 'hover:bg-white/5'
          }`}
          type="button"
          disabled={!authed}
          onClick={() => {
            if (!authed) return
            props.setDraft((d) => ({ ...d, is_private: e.is_private === 1 ? 0 : 1 }))
            props.markDirty()
          }}
          title={authed ? 'Toggle private' : 'Unlock to set private'}
        >
          {e.is_private === 1 ? 'Private' : 'Public'}
        </button>
        {!authed && <span className="text-xs opacity-60">Unlock to set private</span>}

        {n.type === 'task' && (
          <>
            <label className="text-xs opacity-70">Due</label>
            <div className="relative">
              <button
                className="border rounded px-3 py-2 text-sm hover:bg-white/5"
                onClick={() => setShowCal((v) => !v)}
                type="button"
              >
                {prettyDue()}
              </button>
              <button
                className="ml-2 border rounded px-2 py-1 text-xs hover:bg-white/5"
                type="button"
                onClick={() => {
                  setDueDate(null)
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
                        e.due_at && new Date(e.due_at).toDateString() === d.toDateString()
                      return (
                        <button
                          key={d.toISOString()}
                          className={`rounded px-2 py-1 ${
                            isSelected
                              ? 'bg-white/20 border border-white/30'
                              : 'border border-white/10 hover:bg-white/10'
                          } ${isCurrentMonth ? '' : 'opacity-40'}`}
                          onClick={() => {
                            setDueDate(d)
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
            <label className="text-xs opacity-70">Priority</label>
            <select
              className="border rounded px-3 py-2 text-sm"
              value={String(e.priority ?? 3)}
              onChange={(ev) => {
                props.setDraft((d) => ({ ...d, priority: Number(ev.target.value) }))
                props.markDirty()
              }}
            >
              <option value="1">1 (high)</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5 (low)</option>
            </select>
            <label className="text-xs opacity-70">Urgent</label>
            <button
              className={`border rounded px-3 py-2 text-sm ${
                (e.urgent ?? 0) === 1 ? 'bg-white/15 border-white/30' : 'hover:bg-white/5'
              }`}
              type="button"
              onClick={() => {
                props.setDraft((d) => ({ ...d, urgent: (e.urgent ?? 0) === 1 ? 0 : 1 }))
                props.markDirty()
              }}
            >
              {(e.urgent ?? 0) === 1 ? 'Urgent' : 'Not urgent'}
            </button>
            <div className="text-xs opacity-70">
              Start: {e.start_at ? new Date(e.start_at).toLocaleDateString() : '—'}
            </div>
            <div className="text-xs opacity-70">
              Completed: {e.completed_at ? new Date(e.completed_at).toLocaleDateString() : '—'}
            </div>
          </>
        )}

        <div className="ml-auto flex gap-2">
          <button
            className="border rounded px-3 py-2 disabled:opacity-50"
            disabled={!props.dirty || props.saving}
            onClick={props.onSave}
          >
            Save
          </button>
          <button
            className="border rounded px-3 py-2 disabled:opacity-50"
            disabled={!props.dirty || props.saving}
            onClick={props.onCancel}
          >
            Cancel
          </button>
          <button className="border rounded px-3 py-2" onClick={props.onDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="mt-4">
        <label className="text-xs opacity-70">Tags</label>
        <TagsEditor
          tags={e.tags}
          onChange={(next) => {
            props.setDraft((d) => ({ ...d, tags: next }))
            props.markDirty()
          }}
        />
      </div>

      <div className="mt-4">
        <label className="text-xs opacity-70">Content</label>
        <textarea
          className="w-full border rounded px-3 py-2 mt-1 min-h-[180px]"
          placeholder="Write here..."
          value={e.content}
          onChange={(ev) => {
            props.setDraft((d) => ({ ...d, content: ev.target.value }))
            props.markDirty()
          }}
        />
      </div>
    </div>
  )
}
