'use client'

import Link from 'next/link'
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
}) {
  const { note } = props

  return (
    <Link
      href={`/note/${note.id}`}
      className="block border rounded p-3 hover:bg-white/5 transition"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded bg-white/10 border border-white/10">
              {TYPE_BADGE[note.type]}
            </span>

            {note.status !== 'open' && (
              <span className="text-xs px-2 py-1 rounded bg-white/10 border border-white/10 opacity-70">
                {note.status}
              </span>
            )}

            {note.pinned === 1 && (
              <span className="text-xs px-2 py-1 rounded bg-white/10 border border-white/10">
                📌 pinned
              </span>
            )}
          </div>

          <div className="mt-2 font-semibold truncate">{note.title}</div>

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
        </div>

        {/* Pin button */}
        <button
          type="button"
          className="border rounded px-2 py-1 text-sm hover:bg-white/10"
          title={note.pinned === 1 ? 'Unpin' : 'Pin'}
          onClick={async (e) => {
            e.preventDefault() // don’t open note
            const next = note.pinned === 1 ? 0 : 1
            await props.onTogglePin(note.id, next)
          }}
        >
          {note.pinned === 1 ? '📌' : '📍'}
        </button>
      </div>
    </Link>
  )
}
