'use client'

import type { GoalStatus } from '../../lib/types'
import type { TimelineScale } from './gantt/utils'

export default function GoalsToolbar(props: {
  q: string
  onQChange: (value: string) => void
  status: GoalStatus | 'all'
  onStatusChange: (value: GoalStatus | 'all') => void
  scale: TimelineScale
  onScaleChange: (value: TimelineScale) => void
  view: 'gantt' | 'list'
  onViewChange: (value: 'gantt' | 'list') => void
  rangeLabel: string
  onPrev: () => void
  onToday: () => void
  onNext: () => void
  onCreate: () => void
  disableRangeNav?: boolean
}) {
  const scaleOptions: Array<{ value: TimelineScale; label: string }> = [
    { value: 'current', label: 'Current' },
    { value: 'month', label: 'Monthly' },
    { value: 'quarter', label: 'Quarterly' },
    { value: 'year', label: 'Yearly' },
  ]

  return (
    <div className="border rounded p-3 space-y-3">
      <div className="flex items-center gap-2">
        <div className="font-semibold text-lg">Goals</div>
        <button
          className="ml-auto border rounded px-3 py-2 text-sm hover:bg-white/10"
          onClick={props.onCreate}
        >
          + Goal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="md:col-span-2">
          <label className="text-xs opacity-70">Search</label>
          <input
            className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
            value={props.q}
            onChange={(e) => props.onQChange(e.target.value)}
            placeholder="Title or description"
          />
        </div>

        <div>
          <label className="text-xs opacity-70">Status</label>
          <select
            className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
            value={props.status}
            onChange={(e) => props.onStatusChange(e.target.value as GoalStatus | 'all')}
          >
            <option value="open">Open</option>
            <option value="done">Done</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </div>

        <div>
          <label className="text-xs opacity-70">View</label>
          <select
            className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
            value={props.view}
            onChange={(e) => props.onViewChange(e.target.value as 'gantt' | 'list')}
          >
            <option value="gantt">Gantt</option>
            <option value="list">List</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs opacity-70">Timeline scale</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {scaleOptions.map((opt) => (
            <button
              key={opt.value}
              className={`border rounded px-3 py-2 text-sm transition ${
                props.scale === opt.value
                  ? 'bg-white/20 border-white/30'
                  : 'border-white/10 hover:bg-white/10'
              }`}
              onClick={() => props.onScaleChange(opt.value)}
              type="button"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="border rounded px-2 py-1 text-sm hover:bg-white/10 disabled:opacity-50"
          onClick={props.onPrev}
          disabled={props.disableRangeNav}
        >
          ←
        </button>
        <button
          className="border rounded px-2 py-1 text-sm hover:bg-white/10 disabled:opacity-50"
          onClick={props.onToday}
          disabled={props.disableRangeNav}
        >
          Today
        </button>
        <button
          className="border rounded px-2 py-1 text-sm hover:bg-white/10 disabled:opacity-50"
          onClick={props.onNext}
          disabled={props.disableRangeNav}
        >
          →
        </button>
        <div className="ml-auto text-sm opacity-80">{props.rangeLabel}</div>
      </div>
    </div>
  )
}
