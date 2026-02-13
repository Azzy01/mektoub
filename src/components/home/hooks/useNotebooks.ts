'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Notebook } from '../../../lib/types'
import { createNotebook, deleteNotebook, listNotebooks, renameNotebook } from '../../../lib/repo'

export function useNotebooks() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [notebookId, setNotebookId] = useState<string | 'all' | 'none'>('all')

  const sidebarItems = useMemo(
    () => [
      { id: 'all' as const, label: 'All notes' },
      { id: 'none' as const, label: 'No notebook' },
    ],
    []
  )

  async function refreshNotebooks() {
    const nbs = await listNotebooks()
    setNotebooks(nbs)
  }

  useEffect(() => {
    void refreshNotebooks()
  }, [])

  async function onCreateNotebook() {
    const name = prompt('Notebook name?')
    if (!name) return
    try {
      await createNotebook(name)
      await refreshNotebooks()
    } catch (e: any) {
      alert(e?.message ?? 'Failed to create notebook')
    }
  }

  async function onRenameNotebook(nb: Notebook) {
    const name = prompt('Rename notebook:', nb.name)
    if (!name) return
    try {
      await renameNotebook(nb.id, name)
      await refreshNotebooks()
    } catch (e: any) {
      alert(e?.message ?? 'Failed to rename notebook')
    }
  }

  async function onDeleteNotebook(nb: Notebook, afterDelete?: () => void) {
    if (!confirm(`Delete notebook "${nb.name}"?\nNotes will remain, but will be moved to "No notebook".`)) return
    try {
      await deleteNotebook(nb.id)
      setNotebookId((cur) => (cur === nb.id ? 'all' : cur))
      await refreshNotebooks()
      afterDelete?.()
    } catch (e: any) {
      alert(e?.message ?? 'Failed to delete notebook')
    }
  }

  return {
    notebooks,
    notebookId,
    setNotebookId,
    sidebarItems,
    refreshNotebooks,
    onCreateNotebook,
    onRenameNotebook,
    onDeleteNotebook,
  }
}
