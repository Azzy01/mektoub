export function toLocalInput(iso: string) {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    const yyyy = d.getFullYear()
    const mm = pad(d.getMonth() + 1)
    const dd = pad(d.getDate())
    const hh = pad(d.getHours())
    const mi = pad(d.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
  }
  
  export function formatBytes(bytes: number) {
    const units = ['B', 'KB', 'MB', 'GB']
    let b = bytes
    let i = 0
    while (b >= 1024 && i < units.length - 1) {
      b /= 1024
      i++
    }
    return `${b.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
  }
  
  export function normTags(tags: string[] | undefined) {
    return Array.from(
      new Set(
        (tags ?? [])
          .map((t) => String(t).trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 20)
      )
    ).sort()
  }
  