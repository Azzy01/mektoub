import type { Note } from '../../lib/types'

export function collectTopTags(ns: Note[]) {
  const freq = new Map<string, number>()
  for (const n of ns) {
    for (const t of n.tags ?? []) {
      freq.set(t, (freq.get(t) ?? 0) + 1
      )
    }
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([t]) => t)
}
