// src/lib/repo/tags.ts

export function parseTags(raw: unknown): string[] {
    if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
    if (typeof raw !== 'string') return []
  
    // 1) JSON array: '["work","home"]'
    try {
      const v = JSON.parse(raw)
      if (Array.isArray(v)) return v.map(String).filter(Boolean)
    } catch {
      // ignore
    }
  
    // 2) fallback: "work, home urgent"
    return raw
      .split(/[,\n]+/)
      .flatMap((chunk) => chunk.split(' '))
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 20)
  }
  
  export function stringifyTags(tags: string[] | undefined): string {
    const clean = (tags ?? [])
      .map((t) => String(t).trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 20)
  
    const uniq = Array.from(new Set(clean))
    return JSON.stringify(uniq)
  }
  