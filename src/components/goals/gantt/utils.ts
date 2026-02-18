'use client'

import type { Goal } from '../../../lib/types'

export type TimelineScale = 'current' | 'month' | 'quarter' | 'year'

export type TimelineWindow = {
  start: Date
  end: Date
  label: string
  totalDays: number
}

export type MonthSegment = {
  label: string
  startOffsetDays: number
  lengthDays: number
}

export type TimelineTick = {
  label: string
  offsetDays: number
}

function toUtcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day))
}

export function parseIsoDate(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map((x) => Number(x))
  return toUtcDate(y, m - 1, d)
}

export function formatIsoDate(date: Date) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(date: Date, days: number) {
  const x = new Date(date)
  x.setUTCDate(x.getUTCDate() + days)
  return x
}

export function addMonths(date: Date, months: number) {
  return toUtcDate(date.getUTCFullYear(), date.getUTCMonth() + months, 1)
}

export function startOfMonth(date: Date) {
  return toUtcDate(date.getUTCFullYear(), date.getUTCMonth(), 1)
}

export function endOfMonth(date: Date) {
  return addDays(toUtcDate(date.getUTCFullYear(), date.getUTCMonth() + 1, 1), -1)
}

export function startOfQuarter(date: Date) {
  const month = date.getUTCMonth()
  const qStart = Math.floor(month / 3) * 3
  return toUtcDate(date.getUTCFullYear(), qStart, 1)
}

export function endOfQuarter(date: Date) {
  return addDays(addMonths(startOfQuarter(date), 3), -1)
}

export function startOfYear(date: Date) {
  return toUtcDate(date.getUTCFullYear(), 0, 1)
}

export function endOfYear(date: Date) {
  return toUtcDate(date.getUTCFullYear(), 11, 31)
}

export function diffDays(a: Date, b: Date) {
  const ms = a.getTime() - b.getTime()
  return Math.floor(ms / 86400000)
}

export function getTimelineWindow(scale: TimelineScale, anchor: Date): TimelineWindow {
  if (scale === 'current') {
    // Fallback "current" window when no goals are provided by caller helpers:
    // use the current month as a sensible default.
    const start = startOfMonth(anchor)
    const end = endOfMonth(anchor)
    return {
      start,
      end,
      label: 'Current',
      totalDays: diffDays(end, start) + 1,
    }
  }

  if (scale === 'month') {
    const start = startOfMonth(anchor)
    const end = endOfMonth(anchor)
    const label = start.toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
    return { start, end, label, totalDays: diffDays(end, start) + 1 }
  }

  if (scale === 'quarter') {
    const start = startOfQuarter(anchor)
    const end = endOfQuarter(anchor)
    const q = Math.floor(start.getUTCMonth() / 3) + 1
    const label = `Q${q} ${start.getUTCFullYear()}`
    return { start, end, label, totalDays: diffDays(end, start) + 1 }
  }

  const start = startOfYear(anchor)
  const end = endOfYear(anchor)
  const label = String(start.getUTCFullYear())
  return { start, end, label, totalDays: diffDays(end, start) + 1 }
}

export function shiftAnchor(scale: TimelineScale, anchor: Date, dir: -1 | 1) {
  if (scale === 'current') return anchor
  if (scale === 'month') return addMonths(startOfMonth(anchor), dir)
  if (scale === 'quarter') return addMonths(startOfQuarter(anchor), dir * 3)
  return toUtcDate(anchor.getUTCFullYear() + dir, 0, 1)
}

export function monthSegments(window: TimelineWindow): MonthSegment[] {
  const out: MonthSegment[] = []
  let cursor = startOfMonth(window.start)

  while (cursor <= window.end) {
    const monthStart = cursor < window.start ? window.start : cursor
    const monthEndRaw = endOfMonth(cursor)
    const monthEnd = monthEndRaw > window.end ? window.end : monthEndRaw
    const lengthDays = diffDays(monthEnd, monthStart) + 1
    const offset = diffDays(monthStart, window.start)

    out.push({
      label: monthStart.toLocaleDateString(undefined, {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }),
      startOffsetDays: offset,
      lengthDays,
    })

    cursor = addMonths(cursor, 1)
  }

  return out
}

export function timelineTicks(window: TimelineWindow, scale: TimelineScale): TimelineTick[] {
  if (scale === 'month' || scale === 'current') {
    if (scale === 'current' && window.totalDays > 62) {
      return monthSegments(window).map((seg) => ({
        label: seg.label.slice(0, 3),
        offsetDays: seg.startOffsetDays,
      }))
    }
    const ticks: TimelineTick[] = []
    for (let i = 0; i < window.totalDays; i += 7) {
      const dt = addDays(window.start, i)
      ticks.push({ label: String(dt.getUTCDate()), offsetDays: i })
    }
    return ticks
  }

  return monthSegments(window).map((seg) => ({
    label: seg.label.slice(0, 3),
    offsetDays: seg.startOffsetDays,
  }))
}

export function getCurrentGoalsWindow(goals: Goal[], anchor: Date): TimelineWindow {
  if (goals.length === 0) {
    const start = startOfMonth(anchor)
    const end = endOfMonth(anchor)
    return {
      start,
      end,
      label: 'Current',
      totalDays: diffDays(end, start) + 1,
    }
  }

  let min = parseIsoDate(goals[0].start_date)
  let max = parseIsoDate(goals[0].end_date)
  for (const g of goals) {
    const start = parseIsoDate(g.start_date)
    const end = parseIsoDate(g.end_date)
    if (start < min) min = start
    if (end > max) max = end
  }

  const paddedStart = addDays(min, -3)
  const paddedEnd = addDays(max, 3)
  return {
    start: paddedStart,
    end: paddedEnd,
    label: `Current (${formatIsoDate(min)} -> ${formatIsoDate(max)})`,
    totalDays: diffDays(paddedEnd, paddedStart) + 1,
  }
}

export function goalBarForWindow(goal: Goal, window: TimelineWindow) {
  const start = parseIsoDate(goal.start_date)
  const end = parseIsoDate(goal.end_date)
  if (end < window.start || start > window.end) return null

  const clampedStart = start < window.start ? window.start : start
  const clampedEnd = end > window.end ? window.end : end
  const leftDays = diffDays(clampedStart, window.start)
  const barDays = diffDays(clampedEnd, clampedStart) + 1

  return {
    leftPct: (leftDays / window.totalDays) * 100,
    widthPct: Math.max((barDays / window.totalDays) * 100, 0.7),
    durationDays: diffDays(end, start) + 1,
  }
}

export function todayLinePct(window: TimelineWindow) {
  const now = new Date()
  const today = toUtcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  if (today < window.start || today > window.end) return null
  const offset = diffDays(today, window.start)
  return (offset / window.totalDays) * 100
}
