'use client'

import { useEffect, useState } from 'react'
import AppShell from '../shell/AppShell'
import SidebarNotebooks from './SidebarNotebooks'
import Home from './Home'
import { useNotebooks } from './hooks/useNotebooks'
import { useNotesList } from './hooks/useNotesList'
import { listNotes } from '../../lib/repo'
import { useAuth } from '../../lib/auth'

export default function HomePage() {
  const nb = useNotebooks()
  const nl = useNotesList(nb.notebookId, { excludeTypes: ['project'] })
  const { authed } = useAuth()
  const [counts, setCounts] = useState<Record<'all' | 'idea' | 'task' | 'list' | 'file', number>>({
    all: 0,
    idea: 0,
    task: 0,
    list: 0,
    file: 0,
  })

  useEffect(() => {
    async function loadCounts() {
      const rows = await listNotes({
        type: 'all',
        status: 'open',
        notebookId: nb.notebookId,
        hideProjectTasks: true,
        includePrivate: authed,
      })
      const map = { all: 0, idea: 0, task: 0, list: 0, file: 0 }
      for (const n of rows) {
        if (n.type === 'project') continue
        map.all++
        if (n.type === 'idea') map.idea++
        if (n.type === 'task') map.task++
        if (n.type === 'list') map.list++
        if (n.type === 'file') map.file++
      }
      setCounts(map)
    }
    loadCounts()
  }, [nb.notebookId, authed, nl.notes.length, nl.status, nl.type])

  return (
    <AppShell
      left={
        <SidebarNotebooks
          sidebarItems={nb.sidebarItems}
          notebookId={nb.notebookId}
          setNotebookId={nb.setNotebookId}
          notebooks={nb.notebooks}
          onCreateNotebook={nb.onCreateNotebook}
          onRenameNotebook={nb.onRenameNotebook}
          onDeleteNotebook={async (n) => nb.onDeleteNotebook(n, nl.refreshNotes)}
          entityType={nl.type as any}
          setEntityType={(v) => {
            nl.setType(v as any)
            nl.setStatus('open')
          }}
          entityCounts={counts}
        />
      }
    >
      <Home nb={nb} nl={nl} />
    </AppShell>
  )
}
