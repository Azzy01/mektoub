'use client'

import type { Goal } from '../../lib/types'

function badgeClass(status: Goal['status']) {
  if (status === 'done') return 'bg-emerald-500/20 border-emerald-300/30 text-emerald-100'
  if (status === 'archived') return 'bg-slate-500/20 border-slate-300/30 text-slate-100'
  return 'bg-sky-500/20 border-sky-300/30 text-sky-100'
}

export default function ListView(props: {
  goals: Goal[]
  parentTitleById: Record<string, string>
  onEdit: (goal: Goal) => void
  onDelete: (goal: Goal) => Promise<void>
}) {
  return (
    <div className="border rounded p-4 overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="text-left opacity-70 border-b">
            <th className="py-2 pr-2">Title</th>
            <th className="py-2 pr-2">Start</th>
            <th className="py-2 pr-2">End</th>
            <th className="py-2 pr-2">Progress</th>
            <th className="py-2 pr-2">Status</th>
            <th className="py-2 pr-2">Parent</th>
            <th className="py-2 pr-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {props.goals.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-4 opacity-70">
                No goals found.
              </td>
            </tr>
          ) : (
            props.goals.map((g) => (
              <tr key={g.id} className="border-b border-white/10">
                <td className="py-2 pr-2">
                  <button className="underline text-left" onClick={() => props.onEdit(g)}>
                    {g.title}
                  </button>
                </td>
                <td className="py-2 pr-2">{g.start_date}</td>
                <td className="py-2 pr-2">{g.end_date}</td>
                <td className="py-2 pr-2">{g.progress}%</td>
                <td className="py-2 pr-2">
                  <span className={`text-xs px-2 py-0.5 rounded border ${badgeClass(g.status)}`}>
                    {g.status}
                  </span>
                </td>
                <td className="py-2 pr-2">
                  {g.parent_id ? props.parentTitleById[g.parent_id] ?? '—' : '—'}
                </td>
                <td className="py-2 pr-2">
                  <div className="flex items-center gap-2">
                    <button
                      className="border rounded px-2 py-1 hover:bg-white/10"
                      onClick={() => props.onEdit(g)}
                    >
                      Edit
                    </button>
                    <button
                      className="border rounded px-2 py-1 hover:bg-white/10"
                      onClick={async () => {
                        if (!confirm(`Delete "${g.title}"?`)) return
                        await props.onDelete(g)
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
