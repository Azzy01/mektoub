'use client'

import Link from 'next/link'
import type { NoteType } from '../../lib/types'

const TYPE_LABEL: Record<NoteType, string> = {
  idea: 'Idea',
  project: 'Project',
  task: 'Task',
  list: 'List',
  file: 'File note',
}

export default function NoteHeader(props: {
  noteType: NoteType
  dirty: boolean
  saving: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/"
        className="underline"
        onClick={(e) => {
          if (props.dirty && !confirm('You have unsaved changes. Leave without saving?')) {
            e.preventDefault()
          }
        }}
      >
        ← Back
      </Link>

      <span className="text-xs px-2 py-1 rounded bg-gray-100">{TYPE_LABEL[props.noteType]}</span>

      <span className="ml-auto text-xs opacity-70">
        {props.dirty ? 'Unsaved changes' : props.saving ? 'Saving…' : 'Saved'}
      </span>
    </div>
  )
}
