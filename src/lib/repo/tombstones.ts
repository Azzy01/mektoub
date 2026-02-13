'use client'

import { getDb } from '../db'

export type DeletableTable =
  | 'notes'
  | 'list_items'
  | 'files'
  | 'notebooks'
  | 'project_nodes'
  | 'blog_categories'
  | 'blog_posts'
  | 'blog_files'

function nowIso() {
  return new Date().toISOString()
}

export async function markDeleted(table: DeletableTable, rowId: string): Promise<void> {
  const db = await getDb()
  const ts = nowIso()
  const id = `${table}:${rowId}`
  await db.query(
    `
    INSERT INTO deleted_rows (id, table_name, row_id, deleted_at, updated_at)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (id) DO UPDATE SET
      deleted_at = EXCLUDED.deleted_at,
      updated_at = EXCLUDED.updated_at;
    `,
    [id, table, rowId, ts, ts]
  )
}

export async function markManyDeleted(rows: Array<{ table: DeletableTable; rowId: string }>): Promise<void> {
  for (const r of rows) {
    await markDeleted(r.table, r.rowId)
  }
}
