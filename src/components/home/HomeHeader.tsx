'use client'

import type { NoteType } from '../../lib/types'

export default function HomeHeader(props: {
  onQuick: () => Promise<void>
  onCreate: (t: NoteType) => Promise<void>
}) {
  return (
    <div className="flex items-center gap-2">
      <h1 className="text-xl font-semibold">Mektoub</h1>

      <div className="ml-auto flex flex-wrap gap-2">
        <button className="border rounded px-3 py-2" onClick={props.onQuick}>
          ⚡ Quick
        </button>

        <button className="border rounded px-3 py-2" onClick={() => props.onCreate('idea')}>
          + Idea
        </button>
        <button className="border rounded px-3 py-2" onClick={() => props.onCreate('project')}>
          + Project
        </button>
        <button className="border rounded px-3 py-2" onClick={() => props.onCreate('task')}>
          + Task
        </button>
        <button className="border rounded px-3 py-2" onClick={() => props.onCreate('list')}>
          + List
        </button>
        <button className="border rounded px-3 py-2" onClick={() => props.onCreate('file')}>
          + File note
        </button>
      </div>
    </div>
  )
}
