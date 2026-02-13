'use client'

// src/lib/repo/files.ts

import { v4 as uuid } from 'uuid'
import { getDb } from '../db'
import type { FileRow } from '../types'
import { markDeleted } from './tombstones'

function nowIso() {
  return new Date().toISOString()
}

export async function attachFile(noteId: string, file: File): Promise<void> {
  const db = await getDb()
  const id = uuid()
  const ts = nowIso()

  const data_base64 = await fileToBase64(file)

  await db.query(
    `
    INSERT INTO files (id, note_id, filename, mime, size, data_base64, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7);
    `,
    [id, noteId, file.name, file.type || 'application/octet-stream', file.size, data_base64, ts]
  )

  // bump note updated_at
  await db.query(`UPDATE notes SET updated_at = $1 WHERE id = $2;`, [nowIso(), noteId])
}

export async function listFiles(noteId: string): Promise<FileRow[]> {
  const db = await getDb()
  const res = await db.query(`SELECT * FROM files WHERE note_id = $1 ORDER BY created_at DESC;`, [noteId])
  return res.rows as FileRow[]
}

export async function deleteFile(id: string): Promise<void> {
  const db = await getDb()
  const res = await db.query(`SELECT note_id FROM files WHERE id = $1 LIMIT 1;`, [id])
  const noteId = (res.rows?.[0] as { note_id?: string } | undefined)?.note_id
  await db.query(`DELETE FROM files WHERE id = $1;`, [id])
  await markDeleted('files', id)
  if (noteId) {
    await db.query(`UPDATE notes SET updated_at = $1 WHERE id = $2;`, [nowIso(), noteId])
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.onload = () => {
      const res = String(reader.result || '')
      const comma = res.indexOf(',')
      resolve(comma >= 0 ? res.slice(comma + 1) : res)
    }
    reader.readAsDataURL(file)
  })
}
