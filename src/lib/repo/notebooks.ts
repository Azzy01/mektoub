'use client'

import { v4 as uuid } from 'uuid'
import { getDb } from '../db'
import type { Notebook } from '../types'
import { markDeleted } from './tombstones'

function nowIso() {
  return new Date().toISOString()
}

export async function listNotebooks(): Promise<Notebook[]> {
  const db = await getDb()
  const res = await db.query(`SELECT * FROM notebooks ORDER BY LOWER(name) ASC;`)
  return res.rows as Notebook[]
}

export async function createNotebook(name: string): Promise<string> {
  const db = await getDb()
  const id = uuid()
  const ts = nowIso()
  const clean = name.trim()
  if (!clean) throw new Error('Notebook name is required')

  await db.query(
    `INSERT INTO notebooks (id, name, created_at, updated_at) VALUES ($1,$2,$3,$4);`,
    [id, clean, ts, ts]
  )

  return id
}

export async function renameNotebook(id: string, name: string): Promise<void> {
  const db = await getDb()
  const clean = name.trim()
  if (!clean) throw new Error('Notebook name is required')
  await db.query(`UPDATE notebooks SET name = $1, updated_at = $2 WHERE id = $3;`, [clean, nowIso(), id])
}

export async function deleteNotebook(id: string): Promise<void> {
  const db = await getDb()
  // detach notes
  await db.query(`UPDATE notes SET notebook_id = NULL WHERE notebook_id = $1;`, [id])
  await db.query(`DELETE FROM notebooks WHERE id = $1;`, [id])
  await markDeleted('notebooks', id)
}
