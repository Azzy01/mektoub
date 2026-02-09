'use client'

import { useRouter } from 'next/navigation'
import type { Note } from '../../lib/types'

const TYPE_BADGE: Record<Note['type'], string> = {
  idea: 'Idea',
  project: 'Project',
  task: 'Task',
  list: 'List',
  file: 'File',
}


export default function NoteCard(props: {
  note: Note
  onTogglePin: (id: string, nextPinned: 0 | 1) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onStatusChange: (id: string, nextStatus: Note['status']) => Promise<void>
}) {
  const { note } = props
  const router = useRouter()
  const preview =
    note.content
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0) || ''

  return (
    <div
      className="block border rounded p-3 hover:bg-white/5 transition cursor-pointer"
      onClick={() => router.push(`/note/${note.id}`)}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-1 rounded bg-white/10 border border-white/10">
              {TYPE_BADGE[note.type]}
            </span>

            <span className="text-xs px-2 py-1 rounded bg-white/10 border border-white/10 opacity-80">
              {note.status}
            </span>

            {note.pinned === 1 && (
              <span className="text-xs px-2 py-1 rounded border border-amber-400/30 bg-amber-500/20 text-amber-100">
                📌 Pinned
              </span>
            )}
            {note.urgent === 1 && (
              <span className="text-xs px-2 py-1 rounded border border-red-400/30 bg-red-500/20 text-red-200">
                ⚠️ Urgent
              </span>
            )}
            {note.is_private === 1 && (
              <span className="text-xs px-2 py-1 rounded border border-purple-400/30 bg-purple-500/20 text-purple-100">
                🔒 Private
              </span>
            )}
          </div>

          <div className="mt-2 font-semibold truncate">{note.title}</div>
          {preview && <div className="mt-1 text-sm opacity-70 truncate">{preview}</div>}

          {note.tags?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {note.tags.slice(0, 6).map((t) => (
                <span
                  key={t}
                  className="text-xs px-2 py-1 rounded bg-white/10 border border-white/10 opacity-80"
                >
                  #{t}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-2 text-xs opacity-70">Priority: P{note.priority ?? 3}</div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <select
            className="border rounded px-2 py-1 text-xs bg-transparent"
            value={note.status}
            onClick={(e) => {
              e.stopPropagation()
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
            }}
            onChange={async (e) => {
              e.stopPropagation()
              await props.onStatusChange(note.id, e.target.value as Note['status'])
            }}
          >
            <option value="open">open</option>
            <option value="done">done</option>
            <option value="archived">archived</option>
          </select>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="border rounded px-2 py-1 text-sm hover:bg-white/10"
              title={note.pinned === 1 ? 'Unpin' : 'Pin'}
              onClick={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                const next = note.pinned === 1 ? 0 : 1
                await props.onTogglePin(note.id, next)
              }}
            >
              {note.pinned === 1 ? '📌' : '📍'}
            </button>
            <button
              type="button"
              className="border rounded px-2 py-1 text-sm hover:bg-white/10 text-red-300"
              title="Delete"
              onClick={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                const ok = confirm(`Delete "${note.title}"? This cannot be undone.`)
                if (!ok) return
                await props.onDelete(note.id)
              }}
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
