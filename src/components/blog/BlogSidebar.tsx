'use client'

import { useState } from 'react'

const DEFAULT_CATEGORIES = [
  'Personal',
  'Travel',
  'Useful',
  'Home',
  'Career',
]

export default function BlogSidebar(props: {
  active: string | null
  onSelect: (cat: string | null) => void
}) {
  const [cats, setCats] = useState<string[]>(DEFAULT_CATEGORIES)

  async function onAdd() {
    const name = prompt('New blog category? (example: Health)')
    if (!name) return
    const t = name.trim()
    if (!t) return
    if (cats.includes(t)) return
    setCats((c) => [...c, t])
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="font-semibold">Blog categories</div>
        <button className="ml-auto border rounded px-2 py-1 text-sm hover:bg-white/10" onClick={onAdd}>
          + Category
        </button>
      </div>

      <div className="mt-3 space-y-1">
        <button
          className={`w-full text-left px-3 py-2 rounded border ${
            props.active === null ? 'bg-white/15 border-white/30' : 'border-transparent hover:bg-white/10'
          }`}
          onClick={() => props.onSelect(null)}
        >
          All
        </button>

        {cats.map((c) => {
          const active = props.active === c
          return (
            <button
              key={c}
              className={`w-full text-left px-3 py-2 rounded border ${
                active ? 'bg-white/15 border-white/30' : 'border-transparent hover:bg-white/10'
              }`}
              onClick={() => props.onSelect(c)}
            >
              {c}
            </button>
          )
        })}
      </div>
    </div>
  )
}
