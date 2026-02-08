'use client'

import type { NoteType } from '../../lib/types'
import { createNote, setPinned } from '../../lib/repo'
import FiltersBar from './FiltersBar'
import HomeHeader from './HomeHeader'
import NotesList from './NotesList'
import TagChips from './TagChips'
import { useNotebooks } from './hooks/useNotebooks'
import { useNotesList } from './hooks/useNotesList'
import ProjectsSection from './ProjectsSection'

export default function Home() {
  // We keep notebooks hook ONLY for selected notebookId (filter),
  // but sidebar UI must NOT be rendered here.
  const nb = useNotebooks()
  const nl = useNotesList(nb.notebookId)

  async function onCreate(t: NoteType) {
    const id = await createNote({
      type: t,
      title: 'Title',
      content: '',
      tags: [],
      notebook_id: nb.notebookId !== 'all' && nb.notebookId !== 'none' ? nb.notebookId : null,
    })
    window.location.href = `/note/${id}`
  }

  async function onQuick() {
    const id = await createNote({
      type: 'idea',
      title: 'Quick note',
      content: '',
      tags: ['quick'],
      notebook_id: nb.notebookId !== 'all' && nb.notebookId !== 'none' ? nb.notebookId : null,
    })
    window.location.href = `/note/${id}`
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

      <ProjectsSection />

      <NotesList
        loading={nl.loading}
        notes={nl.notes}
        onTogglePin={async (id, nextPinned) => {
          await setPinned(id, nextPinned)
          await nl.refreshNotes()
        }}
      />
    </div>
  )
}
