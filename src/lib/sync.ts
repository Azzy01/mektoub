'use client'

import { getDb } from './db'
import { getAuthToken } from './auth'

type TableName =
  | 'notes'
  | 'list_items'
  | 'files'
  | 'notebooks'
  | 'project_nodes'
  | 'blog_categories'
  | 'blog_posts'
  | 'blog_files'

const TABLES: TableName[] = [
  'notes',
  'list_items',
  'files',
  'notebooks',
  'project_nodes',
  'blog_categories',
  'blog_posts',
  'blog_files',
]

export async function syncNow(): Promise<void> {
  const token = getAuthToken()
  if (!token) return
  const db = await getDb()

  const data: Record<string, any[]> = {}
  for (const t of TABLES) {
    const res = await db.query(`SELECT * FROM ${t};`)
    data[t] = res.rows as any[]
  }

  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ data }),
  })
  if (!res.ok) return
  const json = await res.json()
  if (!json?.data) return

  await db.exec('BEGIN;')
  try {
    for (const t of TABLES) {
      const rows = json.data[t] || []
      for (const r of rows) {
        const cols = Object.keys(r)
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(',')
        const updates = cols.map((c, i) => `${c} = EXCLUDED.${c}`).join(',')
        const values = cols.map((c) => (r as any)[c])
        await db.query(
          `INSERT INTO ${t} (${cols.join(',')}) VALUES (${placeholders})
           ON CONFLICT (id) DO UPDATE SET ${updates};`,
          values
        )
      }
    }
    await db.exec('COMMIT;')
  } catch (e) {
    await db.exec('ROLLBACK;')
    throw e
  }
}
