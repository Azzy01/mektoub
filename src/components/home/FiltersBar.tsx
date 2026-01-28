'use client'

import { useMemo } from 'react'
import type { NoteStatus, NoteType } from '../../lib/types'

export default function FiltersBar(props: {
  q: string
  setQ: (v: string) => void
  type: NoteType | 'all'
  setType: (v: NoteType | 'all') => void
  status: NoteStatus | 'all'
  setStatus: (v: NoteStatus | 'all') => void
  urgentOnly: boolean
  setUrgentOnly: (v: boolean) => void
}) {
  const typeOptions = useMemo(
    () => [
      { value: 'all', label: 'All' },
      { value: 'idea', label: 'Ideas' },
      { value: 'project', label: 'Projects' },
      { value: 'task', label: 'Tasks' },
      { value: 'list', label: 'Lists' },
      { value: 'file', label: 'Files' },
    ] as const,
    []
  )

  const statusOptions = useMemo(
    () =>
      [
        { value: 'open', label: 'Open' },
        { value: 'done', label: 'Done' },
        { value: 'archived', label: 'Archived' },
        { value: 'all', label: 'All' },
      ] as const,
    []
  )

  return (
    <div className="border rounded p-3 flex flex-wrap gap-2 items-center">
      <input
        className="border rounded px-3 py-2 flex-1 min-w-[220px]"
        placeholder="Search..."
        value={props.q}
        onChange={(e) => props.setQ(e.target.value)}
      />

      <select
        className="border rounded px-3 py-2"
        value={props.type}
        onChange={(e) => props.setType(e.target.value as any)}
      >
        {typeOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        className="border rounded px-3 py-2"
        value={props.status}
        onChange={(e) => props.setStatus(e.target.value as any)}
      >
        {statusOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-2 text-sm opacity-80">
        <input
          type="checkbox"
          checked={props.urgentOnly}
          onChange={(e) => props.setUrgentOnly(e.target.checked)}
        />
        Urgent only
      </label>
    </div>
  )
}
