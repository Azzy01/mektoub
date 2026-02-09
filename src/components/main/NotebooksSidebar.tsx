'use client'

import { useEffect, useState } from 'react'
import type { Notebook } from '../../lib/types'
import { createNotebook, deleteNotebook, listNotebooks, renameNotebook } from '../../lib/repo'

export default function NotebooksSidebar() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([])

  async function refresh() {
    setNotebooks(await listNotebooks())
  }

  useEffect(() => {
    refresh()
  }, [])

  async function onCreate() {
    const name = prompt('Notebook name?')
    if (!name) return
    await createNotebook(name)
    await refresh()
  }

  async function onRename(nb: Notebook) {
    const name = prompt('Rename notebook:', nb.name)
    if (!name) return
    await renameNotebook(nb.id, name)
    await refresh()
  }

  async function onDelete(nb: Notebook) {
    if (!confirm(`Delete notebook "${nb.name}"?\nNotes remain, moved to "No notebook".`)) return
    await deleteNotebook(nb.id)
    await refresh()
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="font-semibold">Notebooks</div>
        <button className="ml-auto border rounded px-2 py-1 text-sm hover:bg-white/10" onClick={onCreate}>
          + Notebook
        </button>
      </div>

      <div className="mt-3 space-y-1">
        {notebooks.map((nb) => (
          <div key={nb.id} className="flex items-center gap-2">
            <div className="flex-1 truncate px-2 py-2 border rounded border-white/10">{nb.name}</div>
            <button className="border rounded px-2 py-2 text-sm hover:bg-white/10" onClick={() => onRename(nb)} title="Rename">
              ✏️
            </button>
            <button className="border rounded px-2 py-2 text-sm hover:bg-white/10" onClick={() => onDelete(nb)} title="Delete">
              🗑️
            </button>
          </div>
        ))}
        {notebooks.length === 0 ? <div className="text-sm opacity-70">No notebooks yet.</div> : null}
      </div>
    </div>
  )
}
