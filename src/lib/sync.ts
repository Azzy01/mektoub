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

type SyncColumn = 'updated_at' | 'created_at'

const TABLES: Array<{ name: TableName; syncColumn: SyncColumn }> = [
  { name: 'notes', syncColumn: 'updated_at' },
  { name: 'list_items', syncColumn: 'updated_at' },
  { name: 'files', syncColumn: 'created_at' },
  { name: 'notebooks', syncColumn: 'updated_at' },
  { name: 'project_nodes', syncColumn: 'updated_at' },
  { name: 'blog_categories', syncColumn: 'updated_at' },
  { name: 'blog_posts', syncColumn: 'updated_at' },
  { name: 'blog_files', syncColumn: 'created_at' },
  { name: 'deleted_rows', syncColumn: 'updated_at' },
]

const PUBLIC_TABLE_SET = new Set<TableName>([
  'notes',
  'blog_categories',
  'blog_posts',
  'deleted_rows',
])

const PUBLIC_DELETED_TABLE_SET = new Set(['notes', 'blog_categories', 'blog_posts'])

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

const TABLE_NAMES = TABLES.map((t) => t.name)
const SYNC_CURSOR_KEY = 'mektoub-sync-cursor-v1'

let syncInFlight: Promise<void> | null = null

function getSyncCursor(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(SYNC_CURSOR_KEY)
}

function setSyncCursor(value: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SYNC_CURSOR_KEY, value)
}

async function selectOutgoingRows(
  db: Awaited<ReturnType<typeof getDb>>,
  table: { name: TableName; syncColumn: SyncColumn },
  since: string | null
) {
  if (!since) {
    const res = await db.query(`SELECT * FROM ${table.name};`)
    return res.rows as any[]
  }

  const res = await db.query(
    `
    SELECT *
    FROM ${table.name}
    WHERE ${table.syncColumn} IS NOT NULL
      AND ${table.syncColumn}::timestamptz > $1::timestamptz;
    `,
    [since]
  )
  return res.rows as any[]
}

async function runSync(): Promise<void> {
  const token = getAuthToken()
  const db = await getDb()
  const clientSyncAt = getSyncCursor()

  const data: Record<string, any[]> = {}
  for (const t of TABLES) {
    if (!token && !PUBLIC_TABLE_SET.has(t.name)) {
      data[t.name] = []
      continue
    }

    let rows = await selectOutgoingRows(db, t, clientSyncAt)
    if (!token) {
      if (t.name === 'notes') {
        rows = rows.filter((r) => Number((r as any).is_private ?? 0) !== 1)
      } else if (t.name === 'blog_posts') {
        rows = rows.filter((r) => String((r as any).status ?? '') !== 'draft')
      } else if (t.name === 'deleted_rows') {
        rows = rows.filter((r) =>
          PUBLIC_DELETED_TABLE_SET.has(String((r as any).table_name ?? ''))
        )
      }
    }
    data[t.name] = rows
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch('/api/sync', {
    method: 'POST',
    headers,
    body: JSON.stringify({ data, clientSyncAt }),
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
    for (const t of TABLE_NAMES) {
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

  const serverSyncAt =
    typeof json?.serverSyncAt === 'string' && json.serverSyncAt
      ? json.serverSyncAt
      : new Date().toISOString()
  setSyncCursor(serverSyncAt)

  window.dispatchEvent(new Event('mektoub-sync-complete'))
}

export async function syncNow(): Promise<void> {
  if (syncInFlight) return syncInFlight
  syncInFlight = runSync().finally(() => {
    syncInFlight = null
  })
  return syncInFlight
}
