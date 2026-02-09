'use client'

import AddItem from './AddItem'
import type { ListItem } from '../../lib/types'
import { addItem, deleteItem, toggleItem } from '../../lib/repo'

export default function NoteListSection(props: {
  noteId: string
  items: ListItem[]
  reload: () => Promise<void>
}) {
  return (
    <div className="mt-6 border rounded p-4">
      <h2 className="font-semibold">List items</h2>

      <AddItem
        onAdd={async (text) => {
          await addItem(props.noteId, text)
          await props.reload()
        }}
      />

      <ul className="mt-3 space-y-2">
        {props.items.map((it) => (
          <li key={it.id} className="flex items-center gap-3 border rounded p-2">
            <input
              type="checkbox"
              checked={it.done === 1}
              onChange={async (e) => {
                await toggleItem(it.id, e.target.checked ? 1 : 0)
                await props.reload()
              }}
            />
            <span className={it.done === 1 ? 'line-through opacity-60' : ''}>{it.text}</span>
            <button
              className="ml-auto text-sm underline"
              onClick={async () => {
                await deleteItem(it.id)
                await props.reload()
              }}
            >
              remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
