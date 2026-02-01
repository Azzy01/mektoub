'use client'

export default function TagChips(props: {
  tags: string[]
  active: string | null
  onToggle: (tag: string) => void
  onClear: () => void
}) {
  if (props.tags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {props.tags.map((t) => {
        const active = props.active === t
        return (
          <button
            key={t}
            className={`text-xs px-2 py-1 rounded border ${
              active ? 'bg-white/20 border-white/30' : 'bg-white/10 border-white/10 hover:bg-white/15'
            }`}
            onClick={() => props.onToggle(t)}
          >
            #{t}
          </button>
        )
      })}

      {props.active && (
        <button
          className="text-xs px-2 py-1 rounded border bg-white/10 border-white/10 hover:bg-white/15 opacity-80"
          onClick={props.onClear}
          title="Clear tag filter"
        >
          Clear
        </button>
      )}
    </div>
  )
}
