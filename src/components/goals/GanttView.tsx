'use client'

import type { Goal } from '../../lib/types'
import {
  getCurrentGoalsWindow,
  getTimelineWindow,
  goalBarForWindow,
  monthSegments,
  parseIsoDate,
  TimelineScale,
  timelineTicks,
  todayLinePct,
} from './gantt/utils'

type GoalTreeRow = {
  goal: Goal
  depth: number
  hasChildren: boolean
}

function badgeClass(status: Goal['status']) {
  if (status === 'done') return 'bg-emerald-500/20 border-emerald-300/30 text-emerald-100'
  if (status === 'archived') return 'bg-slate-500/20 border-slate-300/30 text-slate-100'
  return 'bg-cyan-500/20 border-cyan-300/30 text-cyan-100'
}

function defaultBarColor(goal: Goal) {
  if (goal.color) return goal.color
  if (goal.status === 'done') return '#16a34a'
  if (goal.status === 'archived') return '#64748b'
  return '#0284c7'
}

function dayDiff(a: string, b: string) {
  const da = parseIsoDate(a)
  const db = parseIsoDate(b)
  return Math.floor((da.getTime() - db.getTime()) / 86400000)
}

function gridBackground(totalDays: number, scale: TimelineScale) {
  const minorStep =
    scale === 'month'
      ? 1
      : scale === 'quarter'
        ? 7
        : scale === 'year'
          ? 14
          : totalDays <= 90
            ? 1
            : 7
  const majorStep =
    scale === 'month'
      ? 7
      : scale === 'quarter'
        ? 30
        : scale === 'year'
          ? 90
          : totalDays <= 90
            ? 7
            : 30
  const minorPct = Math.max((minorStep / totalDays) * 100, 0.2)
  const majorPct = Math.max((majorStep / totalDays) * 100, 0.6)
  return {
    backgroundImage:
      'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px)',
    backgroundSize: `${minorPct}% 100%, ${majorPct}% 100%`,
  } as const
}

function durationDays(goal: Goal) {
  return dayDiff(goal.end_date, goal.start_date) + 1
}

export default function GanttView(props: {
  rows: GoalTreeRow[]
  allGoals: Goal[]
  scale: TimelineScale
  anchorDate: Date
  expanded: Set<string>
  onToggleExpand: (id: string) => void
  onEdit: (goal: Goal) => void
}) {
  const window =
    props.scale === 'current'
      ? getCurrentGoalsWindow(props.allGoals, props.anchorDate)
      : getTimelineWindow(props.scale, props.anchorDate)
  const segments = monthSegments(window)
  const ticks = timelineTicks(window, props.scale)
  const todayPct = todayLinePct(window)
  const timelineWidth =
    props.scale === 'current'
      ? Math.max(1200, Math.min(window.totalDays * 16, 2600))
      : props.scale === 'year'
        ? 1900
        : props.scale === 'quarter'
          ? 1400
          : 1100
  const leftWidth = 360
  const timelineGrid = gridBackground(window.totalDays, props.scale)

  return (
    <div className="border rounded-xl overflow-auto bg-gradient-to-b from-white/[0.04] to-transparent">
      <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2 text-xs">
        <span className="opacity-70">Gantt</span>
        <span className="opacity-40">|</span>
        <span className="px-2 py-0.5 rounded border bg-cyan-500/20 border-cyan-300/30 text-cyan-100">
          open
        </span>
        <span className="px-2 py-0.5 rounded border bg-emerald-500/20 border-emerald-300/30 text-emerald-100">
          done
        </span>
        <span className="px-2 py-0.5 rounded border bg-slate-500/20 border-slate-300/30 text-slate-100">
          archived
        </span>
        <span className="ml-auto opacity-70">
          Range: {window.label}
        </span>
      </div>

      <div style={{ minWidth: leftWidth + timelineWidth }}>
        <div
          className="grid sticky top-0 z-30 backdrop-blur bg-[color:var(--background)]/95 border-b border-white/10"
          style={{ gridTemplateColumns: `${leftWidth}px ${timelineWidth}px` }}
        >
          <div className="sticky left-0 z-30 bg-[color:var(--background)]/95 border-r border-white/10 px-3 py-2">
            <div className="font-semibold">Goal</div>
            <div className="text-xs opacity-70">Hierarchy, progress, status</div>
          </div>
          <div className="relative h-14">
            <div className="absolute inset-0">
              {segments.map((seg, i) => {
                const left = (seg.startOffsetDays / window.totalDays) * 100
                const width = (seg.lengthDays / window.totalDays) * 100
                return (
                  <div
                    key={`${seg.label}-${i}`}
                    className={`absolute top-0 h-full border-r border-white/10 ${
                      i % 2 === 0 ? 'bg-white/[0.03]' : 'bg-transparent'
                    }`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    <div className="px-2 py-1 text-xs opacity-80 truncate">{seg.label}</div>
                  </div>
                )
              })}
            </div>

            <div className="absolute inset-x-0 bottom-1 h-5">
              {ticks.map((tick, i) => {
                const left = (tick.offsetDays / window.totalDays) * 100
                return (
                  <div
                    key={`tick-${tick.offsetDays}-${i}`}
                    className="absolute bottom-0 translate-x-[-50%] text-[11px] opacity-65"
                    style={{ left: `${left}%` }}
                  >
                    {tick.label}
                  </div>
                )
              })}
            </div>

            <div className="absolute inset-0" style={timelineGrid} />

            {todayPct !== null ? (
              <>
                <div
                  className="absolute top-0 h-full w-[2px] bg-red-400/80"
                  style={{ left: `${todayPct}%` }}
                  title="Today"
                />
                <div
                  className="absolute top-1 -translate-x-1/2 text-[10px] px-1.5 py-0.5 rounded border border-red-300/40 bg-red-500/20 text-red-100"
                  style={{ left: `${todayPct}%` }}
                >
                  Today
                </div>
              </>
            ) : null}
          </div>
        </div>

        {props.rows.length === 0 ? (
          <div className="px-3 py-4 text-sm opacity-70">No goals for selected filters.</div>
        ) : (
          props.rows.map((row) => {
            const bar = goalBarForWindow(row.goal, window)
            const totalDuration = durationDays(row.goal)
            const barColor = defaultBarColor(row.goal)
            const startsBefore = parseIsoDate(row.goal.start_date) < window.start
            const endsAfter = parseIsoDate(row.goal.end_date) > window.end
            const compactBar = (bar?.widthPct ?? 0) < 13

            return (
              <div
                key={row.goal.id}
                className="group grid border-b border-white/10 hover:bg-white/[0.03] transition-colors"
                style={{ gridTemplateColumns: `${leftWidth}px ${timelineWidth}px` }}
              >
                <div className="sticky left-0 z-10 bg-[color:var(--background)]/96 border-r border-white/10 px-2 py-2">
                  <div className="flex items-center gap-2" style={{ paddingLeft: 6 + row.depth * 16 }}>
                    {row.hasChildren ? (
                      <button
                        className="w-6 h-6 border rounded-md text-xs hover:bg-white/10"
                        onClick={() => props.onToggleExpand(row.goal.id)}
                        title={props.expanded.has(row.goal.id) ? 'Collapse' : 'Expand'}
                      >
                        {props.expanded.has(row.goal.id) ? '-' : '+'}
                      </button>
                    ) : (
                      <span className="w-6 text-center opacity-40">.</span>
                    )}

                    <div className="min-w-0 flex-1">
                      <button
                        className="text-left w-full truncate font-medium hover:underline"
                        onClick={() => props.onEdit(row.goal)}
                        title={`${row.goal.title} (${row.goal.start_date} -> ${row.goal.end_date})`}
                      >
                        {row.goal.title}
                      </button>
                      <div className="text-[11px] opacity-65 truncate">
                        {row.goal.start_date} {'->'} {row.goal.end_date} ({totalDuration}d)
                      </div>
                    </div>

                    <div className="text-xs opacity-75 w-10 text-right">{row.goal.progress}%</div>
                    <span className={`text-[11px] px-2 py-0.5 rounded border ${badgeClass(row.goal.status)}`}>
                      {row.goal.status}
                    </span>
                  </div>
                </div>

                <div className="relative h-14">
                  <div className="absolute inset-0" style={timelineGrid} />

                  {segments.map((seg, i) => {
                    const left = (seg.startOffsetDays / window.totalDays) * 100
                    const width = (seg.lengthDays / window.totalDays) * 100
                    return (
                      <div
                        key={`${row.goal.id}-seg-${i}`}
                        className={`absolute top-0 h-full border-r border-white/10 ${
                          i % 2 === 0 ? 'bg-white/[0.03]' : 'bg-transparent'
                        }`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                      />
                    )
                  })}

                  {todayPct !== null ? (
                    <div
                      className="absolute top-0 h-full w-[2px] bg-red-400/80"
                      style={{ left: `${todayPct}%` }}
                    />
                  ) : null}

                  {bar ? (
                    <button
                      className="absolute top-3 h-8 rounded-lg text-left text-xs text-white shadow-[0_6px_16px_rgba(0,0,0,0.35)] hover:brightness-110 overflow-hidden border border-black/25"
                      style={{ left: `${bar.leftPct}%`, width: `${bar.widthPct}%`, background: barColor }}
                      onClick={() => props.onEdit(row.goal)}
                      title={`${row.goal.title}\n${row.goal.start_date} -> ${row.goal.end_date}\n${bar.durationDays} days`}
                    >
                      <span
                        className="absolute left-0 top-0 h-full bg-white/20"
                        style={{ width: `${Math.max(0, Math.min(row.goal.progress, 100))}%` }}
                      />
                      {startsBefore ? (
                        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] opacity-90">
                          &lt;
                        </span>
                      ) : null}
                      {endsAfter ? (
                        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] opacity-90">
                          &gt;
                        </span>
                      ) : null}
                      <span className="relative z-10 h-full px-2 flex items-center gap-2">
                        {compactBar ? (
                          <span className="mx-auto text-[11px] font-medium">{row.goal.progress}%</span>
                        ) : (
                          <>
                            <span className="truncate">{row.goal.title}</span>
                            <span className="ml-auto text-[11px] opacity-90">{row.goal.progress}%</span>
                          </>
                        )}
                      </span>
                    </button>
                  ) : (
                    <div className="absolute top-4 right-2 text-[11px] opacity-45">
                      {totalDuration}d (out of range)
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
