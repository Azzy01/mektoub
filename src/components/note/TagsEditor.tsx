'use client'
import { useState } from 'react'
import { normTags } from './utils'

export default function TagsEditor({
  tags,
  onChange,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
}) {
  const [text, setText] = useState('')

  function addTag(raw: string) {
    const t = raw.trim().toLowerCase()
    if (!t) return
    if (t.length > 30) return
    onChange(normTags([...(tags ?? []), t]))
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((t) => (
          <span
            key={t}
            className="text-xs px-2 py-1 rounded bg-white/10 border border-white/10 flex items-center gap-2"
          >
            #{t}
            <button
              className="opacity-70 hover:opacity-100"
              onClick={() => onChange(tags.filter((x) => x !== t))}
              title="remove"
              type="button"
            >
              ×
            </button>
          </span>
        ))}
        {tags.length === 0 && <span className="text-xs opacity-50">No tags</span>}
      </div>

      <input
        className="border rounded px-3 py-2 w-full"
        placeholder="Add tag and press Enter"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            addTag(text)
            setText('')
          }
        }}
      />
    </div>
  )
}
