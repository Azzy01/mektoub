'use client'

// src/lib/repo/listItems.ts

import { v4 as uuid } from 'uuid'
import { getDb } from '../db'
import type { ListItem } from '../types'

function nowIso() {
  return new Date().toISOString()
}

export async function listItems(noteId: string): Promise<ListItem[]> {
  const db = await getDb()
  const res = await db.query(
    `SELECT * FROM list_items WHERE note_id = $1 ORDER BY sort_order ASC, created_at ASC;`,
    [noteId]
  )
  return res.rows as ListItem[]
}

export async function addItem(noteId: string, text: string): Promise<void> {
  const db = await getDb()
  const id = uuid()
  const ts = nowIso()

  const orderRes = await db.query(
    `SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM list_items WHERE note_id = $1;`,
    [noteId]
  )
  const maxOrder = Number((orderRes.rows?.[0] as any)?.max_order ?? 0)

  await db.query(
    `
    INSERT INTO list_items (id, note_id, text, done, sort_order, created_at, updated_at)
    VALUES ($1,$2,$3,0,$4,$5,$6);
    `,
    [id, noteId, text.trim(), maxOrder + 1, ts, ts]
  )

  // bump note updated_at (nice for sorting)
  await db.query(`UPDATE notes SET updated_at = $1 WHERE id = $2;`, [nowIso(), noteId])
}

export async function toggleItem(id: string, done: 0 | 1): Promise<void> {
  const db = await getDb()
  await db.query(`UPDATE list_items SET done = $1, updated_at = $2 WHERE id = $3;`, [done, nowIso(), id])
}

export async function deleteItem(id: string): Promise<void> {
  const db = await getDb()
  await db.query(`DELETE FROM list_items WHERE id = $1;`, [id])
}
