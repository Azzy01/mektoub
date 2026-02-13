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
  | 'deleted_rows'

const TABLES: TableName[] = [
  'notes',
  'list_items',
  'files',
  'notebooks',
  'project_nodes',
  'blog_categories',
  'blog_posts',
  'blog_files',
  'deleted_rows',
]

const DELETABLE_TABLES: Array<Exclude<TableName, 'deleted_rows'>> = [
  'notes',
  'list_items',
  'files',
  'notebooks',
  'project_nodes',
  'blog_categories',
  'blog_posts',
  'blog_files',
]

let syncInFlight: Promise<void> | null = null

async function runSync(): Promise<void> {
  const token = getAuthToken()
  const db = await getDb()

  const data: Record<string, any[]> = {}
  for (const t of TABLES) {
    const res = await db.query(`SELECT * FROM ${t};`)
    data[t] = res.rows as any[]
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch('/api/sync', {
    method: 'POST',
    headers,
    body: JSON.stringify({ data }),
    cache: 'no-store',
  })
  if (!res.ok) {
    console.warn(`[mektoub-sync] sync failed with status ${res.status}`)
    return
  }
  const json = await res.json()
  if (!json?.data) return

  // normalize blog_categories by name to avoid duplicate name constraint
  if (json.data.blog_categories) {
    const serverCats = json.data.blog_categories as any[]
    const localCatsRes = await db.query(`SELECT id, name FROM blog_categories;`)
    const localByName = new Map(
      (localCatsRes.rows as any[]).map((r) => [String(r.name), String(r.id)])
    )
    for (const c of serverCats) {
      const name = String(c.name)
      const serverId = String(c.id)
      const localId = localByName.get(name)
      if (localId && localId !== serverId) {
        // move posts to server category id, then replace local category row
        await db.query(`UPDATE blog_posts SET category_id = $1 WHERE category_id = $2;`, [
          serverId,
          localId,
        ])
        await db.query(`DELETE FROM blog_categories WHERE id = $1;`, [localId])
      }
    }
  }

  await db.exec('BEGIN;')
  try {
    for (const t of TABLES) {
      const rows = json.data[t] || []
      for (const r of rows) {
        const cols = Object.keys(r)
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(',')
        const updates = cols.map((c) => `${c} = EXCLUDED.${c}`).join(',')
        const values = cols.map((c) => (r as any)[c])
        if (t === 'blog_categories') {
          // avoid duplicate name constraint
          await db.query(
            `INSERT INTO ${t} (${cols.join(',')}) VALUES (${placeholders})
             ON CONFLICT (name) DO UPDATE SET ${updates};`,
            values
          )
        } else {
          await db.query(
            `INSERT INTO ${t} (${cols.join(',')}) VALUES (${placeholders})
             ON CONFLICT (id) DO UPDATE SET ${updates};`,
            values
          )
        }
      }
    }

    // Apply server tombstones after upserts to prevent resurrected rows.
    const deletedRows = (json.data.deleted_rows || []) as Array<Record<string, unknown>>
    for (const row of deletedRows) {
      const table = String(row.table_name || '')
      const rowId = String(row.row_id || '')
      if (!rowId) continue
      if (!DELETABLE_TABLES.includes(table as Exclude<TableName, 'deleted_rows'>)) continue
      await db.query(`DELETE FROM ${table} WHERE id = $1;`, [rowId])
    }

    await db.exec('COMMIT;')
  } catch (e) {
    await db.exec('ROLLBACK;')
    throw e
  }

  window.dispatchEvent(new Event('mektoub-sync-complete'))
}

export async function syncNow(): Promise<void> {
  if (syncInFlight) return syncInFlight
  syncInFlight = runSync().finally(() => {
    syncInFlight = null
  })
  return syncInFlight
}
