'use client'

import { useEffect, useState } from 'react'
import { createBlogCategory, deleteBlogCategory, listBlogCategories, listBlogCategoryCounts, updateBlogCategory } from '../../lib/repo'

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
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [rows, cnts] = await Promise.all([
        listBlogCategories(),
        listBlogCategoryCounts(),
      ])
      if (cancelled) return
      setCounts(cnts)
      if (rows.length === 0) {
        for (const name of DEFAULT_CATEGORIES) {
          try {
            await createBlogCategory(name)
          } catch {
            // ignore duplicates
          }
        }
        const seeded = await listBlogCategories()
        const seededCounts = await listBlogCategoryCounts()
        if (!cancelled) setCats(seeded.map((c) => ({ id: c.id, name: c.name })))
        if (!cancelled) setCounts(seededCounts)
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
    const [rows, cnts] = await Promise.all([
      listBlogCategories(),
      listBlogCategoryCounts(),
    ])
    setCats(rows.map((c) => ({ id: c.id, name: c.name })))
    setCounts(cnts)
    window.dispatchEvent(new Event('blog-categories-updated'))
  }

  async function onEdit(cat: { id: string; name: string }) {
    setEditId(cat.id)
    setEditName(cat.name)
  }

  async function onSaveEdit() {
    if (!editId) return
    await updateBlogCategory(editId, editName)
    setEditId(null)
    setEditName('')
    const [rows, cnts] = await Promise.all([
      listBlogCategories(),
      listBlogCategoryCounts(),
    ])
    setCats(rows.map((c) => ({ id: c.id, name: c.name })))
    setCounts(cnts)
    window.dispatchEvent(new Event('blog-categories-updated'))
  }

  async function onDelete(cat: { id: string; name: string }) {
    const ok = confirm(`Delete category "${cat.name}"?`)
    if (!ok) return
    try {
      await deleteBlogCategory(cat.id)
      const [rows, cnts] = await Promise.all([
        listBlogCategories(),
        listBlogCategoryCounts(),
      ])
      setCats(rows.map((c) => ({ id: c.id, name: c.name })))
      setCounts(cnts)
      window.dispatchEvent(new Event('blog-categories-updated'))
    } catch (e: any) {
      alert(e?.message || 'Cannot delete category.')
    }
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
            <div
              key={c.id}
              className={`w-full px-3 py-2 rounded border ${
                active ? 'bg-white/15 border-white/30' : 'border-transparent hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2 group">
                <button
                  className="text-left flex-1 truncate flex items-center gap-2"
                  onClick={() => props.onSelect(c.id)}
                >
                  <span className="truncate">{c.name}</span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full border border-white/20 bg-white/10 opacity-80">
                    {counts[c.id] ?? 0}
                  </span>
                </button>
                {editId === c.id && (
                  <input
                    className="w-40 bg-transparent border rounded px-2 py-1 text-sm"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                {editId === c.id ? (
                  <button
                    className="border rounded px-2 py-1 text-xs hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSaveEdit()
                    }}
                  >
                    Save
                  </button>
                ) : (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="border rounded px-2 py-1 text-xs hover:bg-white/10"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(c)
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="border rounded px-2 py-1 text-xs hover:bg-white/10 text-red-300"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(c)
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
