'use client'
import { useState } from 'react'

export default function AddItem({ onAdd }: { onAdd: (text: string) => Promise<void> }) {
  const [text, setText] = useState('')
  return (
    <div className="mt-3 flex gap-2">
      <input
        className="border rounded px-3 py-2 flex-1"
        placeholder="New item..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={async (e) => {
          if (e.key === 'Enter') {
            const t = text.trim()
            if (!t) return
            setText('')
            await onAdd(t)
          }
        }}
      />
      <button
        className="border rounded px-3 py-2"
        onClick={async () => {
          const t = text.trim()
          if (!t) return
          setText('')
          await onAdd(t)
        }}
      >
        Add
      </button>
    </div>
  )
}
