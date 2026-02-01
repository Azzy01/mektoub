'use client'

import type { Notebook } from '../../lib/types'

export default function SidebarNotebooks(props: {
  sidebarItems: { id: 'all' | 'none'; label: string }[]
  notebookId: string | 'all' | 'none'
  setNotebookId: (v: string | 'all' | 'none') => void
  notebooks: Notebook[]
  onCreateNotebook: () => Promise<void>
  onRenameNotebook: (nb: Notebook) => Promise<void>
  onDeleteNotebook: (nb: Notebook) => Promise<void>
}) {
  return (
    <aside className="border rounded p-3 h-fit md:sticky md:top-6">
      <div className="flex items-center gap-2">
        <div className="font-semibold">Notebooks</div>
        <button className="ml-auto border rounded px-2 py-1 text-sm" onClick={props.onCreateNotebook}>
          + Notebook
        </button>
      </div>

      <div className="mt-3 space-y-1">
        {props.sidebarItems.map((it) => (
          <button
            key={it.id}
            className={`w-full text-left px-3 py-2 rounded border ${
              props.notebookId === it.id ? 'bg-white/15 border-white/20' : 'border-transparent hover:bg-white/10'
            }`}
            onClick={() => props.setNotebookId(it.id)}
          >
            {it.label}
          </button>
        ))}

        <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
          {props.notebooks.map((nb) => {
            const active = props.notebookId === nb.id
            return (
              <div key={nb.id} className="flex items-center gap-2">
                <button
                  className={`flex-1 text-left px-3 py-2 rounded border ${
                    active ? 'bg-white/15 border-white/20' : 'border-transparent hover:bg-white/10'
                  }`}
                  onClick={() => props.setNotebookId(nb.id)}
                  title={nb.name}
                >
                  <span className="truncate block">{nb.name}</span>
                </button>

                <button
                  className="border rounded px-2 py-2 text-sm hover:bg-white/10"
                  title="Rename"
                  onClick={() => props.onRenameNotebook(nb)}
                >
                  ✏️
                </button>
                <button
                  className="border rounded px-2 py-2 text-sm hover:bg-white/10"
                  title="Delete"
                  onClick={() => props.onDeleteNotebook(nb)}
                >
                  🗑️
                </button>
              </div>
            )
          })}

          {props.notebooks.length === 0 && <div className="text-sm opacity-70 px-1 pt-1">No notebooks yet.</div>}
        </div>
      </div>
    </aside>
  )
}
