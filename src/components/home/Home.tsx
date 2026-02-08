'use client'

import type { NoteType } from '../../lib/types'
import { deleteNote, setPinned, updateNote } from '../../lib/repo'
import { useRouter } from 'next/navigation'
import FiltersBar from './FiltersBar'
import HomeHeader from './HomeHeader'
import NotesList from './NotesList'
import TagChips from './TagChips'
import { useNotebooks } from './hooks/useNotebooks'
import { useNotesList } from './hooks/useNotesList'

export default function Home() {
  // We keep notebooks hook ONLY for selected notebookId (filter),
  // but sidebar UI must NOT be rendered here.
  const nb = useNotebooks()
  const nl = useNotesList(nb.notebookId, { excludeTypes: ['project'] })
  const router = useRouter()


  async function onCreate(t: NoteType) {
    const notebookId = nb.notebookId !== 'all' && nb.notebookId !== 'none' ? nb.notebookId : null
    const q = new URLSearchParams()
    q.set('type', t)
    if (notebookId) q.set('nb', notebookId)
    router.push(`/note/new?${q.toString()}`)
  }

  async function onQuick() {
    const notebookId = nb.notebookId !== 'all' && nb.notebookId !== 'none' ? nb.notebookId : null
    const q = new URLSearchParams()
    q.set('type', 'idea')
    q.set('quick', '1')
    if (notebookId) q.set('nb', notebookId)
    router.push(`/note/new?${q.toString()}`)
  }

  return (
    <div className="space-y-4">
      <HomeHeader onQuick={onQuick} onCreate={onCreate} />

      <FiltersBar
        q={nl.q}
        setQ={nl.setQ}
        type={nl.type}
        setType={nl.setType}
        status={nl.status}
        setStatus={nl.setStatus}
        urgentOnly={nl.urgentOnly}
        setUrgentOnly={nl.setUrgentOnly}
      />

      <TagChips
        tags={nl.topTags}
        active={nl.tagFilter}
        onToggle={(t) => nl.setTagFilter(nl.tagFilter === t ? null : t)}
        onClear={() => nl.setTagFilter(null)}
      />

      
      <NotesList
        loading={nl.loading}
        notes={nl.notes}
        onTogglePin={async (id, nextPinned) => {
          await setPinned(id, nextPinned)
          await nl.refreshNotes()
        }}
        onDelete={async (id) => {
          await deleteNote(id)
          await nl.refreshNotes()
        }}
        onStatusChange={async (id, nextStatus) => {
          await updateNote(id, { status: nextStatus })
          await nl.refreshNotes()
        }}
      />
    </div>
  )
}
