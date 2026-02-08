'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Note, NoteStatus, NoteType } from '../../../lib/types'
import { listNotes } from '../../../lib/repo'
import { collectTopTags } from '../utils'

export function useNotesList(
    notebookId: string | 'all' | 'none',
    opts?: { excludeTypes?: NoteType[] }
  ) {
  
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  const [q, setQ] = useState('')
  const [type, setType] = useState<NoteType | 'all'>('all')
  const [status, setStatus] = useState<NoteStatus | 'all'>('open')
  const [urgentOnly, setUrgentOnly] = useState(false)
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  async function refreshNotes() {
    setLoading(true)
    const res = await listNotes({ q, type, status, notebookId, hideProjectTasks: true })
    const excluded = new Set(opts?.excludeTypes ?? [])
    const res2 = excluded.size ? res.filter(n => !excluded.has(n.type as any)) : res


    const afterUrgent = urgentOnly ? res.filter((n) => n.urgent === 1) : res2
    const afterTag = tagFilter ? afterUrgent.filter((n) => (n.tags ?? []).includes(tagFilter)) : afterUrgent

    setNotes(afterTag)
    setLoading(false)
  }

  useEffect(() => {
    refreshNotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type, status, urgentOnly, tagFilter, notebookId])

  const topTags = useMemo(() => collectTopTags(notes), [notes])

  return {
    notes,
    loading,
    q,
    setQ,
    type,
    setType,
    status,
    setStatus,
    urgentOnly,
    setUrgentOnly,
    tagFilter,
    setTagFilter,
    topTags,
    refreshNotes,
  }
}
