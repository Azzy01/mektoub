'use client'

import { useEffect, useState } from 'react'
import { createBlogCategory, listBlogCategories } from '../../lib/repo'

const DEFAULT_CATEGORIES = [
  'Personal',
  'Travel',
  'Useful',
  'Home',
  'Career',
]

export default function BlogSidebar(props: {
  active: string | null
  onSelect: (catId: string | null) => void
}) {
  const [cats, setCats] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const rows = await listBlogCategories()
      if (cancelled) return
      if (rows.length === 0) {
        for (const name of DEFAULT_CATEGORIES) {
          try {
            await createBlogCategory(name)
          } catch {
            // ignore duplicates
          }
        }
        const seeded = await listBlogCategories()
        if (!cancelled) setCats(seeded.map((c) => ({ id: c.id, name: c.name })))
        window.dispatchEvent(new Event('blog-categories-updated'))
        return
      }
      setCats(rows.map((c) => ({ id: c.id, name: c.name })))
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function onAdd() {
    const name = prompt('New blog category? (example: Health)')
    if (!name) return
    const t = name.trim()
    if (!t) return
    if (cats.some((c) => c.name === t)) return
    await createBlogCategory(t)
    const rows = await listBlogCategories()
    setCats(rows.map((c) => ({ id: c.id, name: c.name })))
    window.dispatchEvent(new Event('blog-categories-updated'))
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

        <button
          className={`w-full text-left px-3 py-2 rounded border ${
            props.active === '__drafts__' ? 'bg-white/15 border-white/30' : 'border-transparent hover:bg-white/10'
          }`}
          onClick={() => props.onSelect('__drafts__')}
        >
          Drafts
        </button>

        {cats.map((c) => {
          const active = props.active === c.id
          return (
            <button
              key={c.id}
              className={`w-full text-left px-3 py-2 rounded border ${
                active ? 'bg-white/15 border-white/30' : 'border-transparent hover:bg-white/10'
              }`}
              onClick={() => props.onSelect(c.id)}
            >
              {c.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
