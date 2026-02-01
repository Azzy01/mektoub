'use client'

import type { Note } from '../../lib/types'
import NoteCard from './NoteCard'

export default function NotesList(props: {
  loading: boolean
  notes: Note[]
  onTogglePin: (id: string, nextPinned: 0 | 1) => Promise<void>
}) {
  if (props.loading) return <div className="opacity-70">Loading…</div>
  if (props.notes.length === 0) return <div className="opacity-70">No notes yet.</div>

  return (
    <div className="space-y-2">
      {props.notes.map((n) => (
        <NoteCard key={n.id} note={n} onTogglePin={props.onTogglePin} />
      ))}
    </div>
  )
}
