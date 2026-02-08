'use client'

import SidebarNotebooks from './SidebarNotebooks'
import { useNotebooks } from './hooks/useNotebooks'
import { useNotesList } from './hooks/useNotesList'

export default function MainLeft() {
  const nb = useNotebooks()
  const nl = useNotesList(nb.notebookId)

  return (
    <SidebarNotebooks
      sidebarItems={nb.sidebarItems}
      notebookId={nb.notebookId}
      setNotebookId={nb.setNotebookId}
      notebooks={nb.notebooks}
      onCreateNotebook={nb.onCreateNotebook}
      onRenameNotebook={nb.onRenameNotebook}
      onDeleteNotebook={async (n) => nb.onDeleteNotebook(n, nl.refreshNotes)}
    />
  )
}
