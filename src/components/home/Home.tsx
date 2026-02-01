'use client'

import type { NoteType } from '../../lib/types'
import { createNote, setPinned } from '../../lib/repo'
import FiltersBar from './FiltersBar'
import HomeHeader from './HomeHeader'
import NotesList from './NotesList'
import SidebarNotebooks from './SidebarNotebooks'
import TagChips from './TagChips'
import { useNotebooks } from './hooks/useNotebooks'
import { useNotesList } from './hooks/useNotesList'

export default function Home() {
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
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
        <SidebarNotebooks
          sidebarItems={nb.sidebarItems}
          notebookId={nb.notebookId}
          setNotebookId={nb.setNotebookId}
          notebooks={nb.notebooks}
          onCreateNotebook={nb.onCreateNotebook}
          onRenameNotebook={nb.onRenameNotebook}
          onDeleteNotebook={async (n) => nb.onDeleteNotebook(n, nl.refreshNotes)}
        />

        <main className="space-y-4">
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
          />
        </main>
      </div>
    </div>
  )
}
