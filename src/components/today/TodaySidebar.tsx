'use client'

import type { Note } from '../../lib/types'

export default function TodaySidebar(props: {
  dueToday: Note[]
  overdue: Note[]
  urgent: Note[]
  pinned: Note[]
  planned: Note[]
}) {
  return (
    <div className="space-y-3">
      <div>
        <div className="font-semibold">Today</div>
        <div className="text-xs opacity-70">Quick daily workflow</div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between border rounded px-3 py-2">
          <span>Due today</span>
          <span className="text-xs opacity-70">{props.dueToday.length}</span>
        </div>
        <div className="flex items-center justify-between border rounded px-3 py-2">
          <span>Overdue</span>
          <span className="text-xs opacity-70">{props.overdue.length}</span>
        </div>
        <div className="flex items-center justify-between border rounded px-3 py-2">
          <span>Urgent</span>
          <span className="text-xs opacity-70">{props.urgent.length}</span>
        </div>
        <div className="flex items-center justify-between border rounded px-3 py-2">
          <span>Pinned</span>
          <span className="text-xs opacity-70">{props.pinned.length}</span>
        </div>
        <div className="flex items-center justify-between border rounded px-3 py-2">
          <span>Planned today</span>
          <span className="text-xs opacity-70">{props.planned.length}</span>
        </div>
      </div>
    </div>
  )
}
