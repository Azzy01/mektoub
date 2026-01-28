'use client'

// src/lib/repo/notes.ts

import { v4 as uuid } from 'uuid'
import { getDb } from '../db'
import type { Note, NoteStatus, NoteType } from '../types'
import { parseTags, stringifyTags } from './tags'

function nowIso() {
  return new Date().toISOString()
}

export async function listNotes(params?: {
  type?: NoteType | 'all'
  q?: string
  projectId?: string | 'all' | 'none'
  status?: NoteStatus | 'all'
}): Promise<Note[]> {
  const db = await getDb()
  const type = params?.type ?? 'all'
  const q = (params?.q ?? '').trim()
  const projectId = params?.projectId ?? 'all'
  const status = params?.status ?? 'all'

  const where: string[] = []
  const values: any[] = []

  if (type !== 'all') {
    values.push(type)
    where.push(`type = $${values.length}`)
  }

  if (status !== 'all') {
    values.push(status)
    where.push(`status = $${values.length}`)
  }

  if (projectId !== 'all') {
    if (projectId === 'none') {
      where.push(`project_id IS NULL`)
    } else {
      values.push(projectId)
      where.push(`project_id = $${values.length}`)
    }
  }

  if (q) {
    values.push(`%${q.toLowerCase()}%`)
    where.push(`(LOWER(title) LIKE $${values.length} OR LOWER(content) LIKE $${values.length})`)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const res = await db.query(
    `
    SELECT * FROM notes
    ${whereSql}
    ORDER BY pinned DESC, updated_at DESC
    LIMIT 500;
    `,
    values
  )

  return (res.rows as any[]).map((r) => ({ ...r, tags: parseTags(r.tags) })) as Note[]
}

export async function getNote(id: string): Promise<Note | null> {
  const db = await getDb()
  const res = await db.query(`SELECT * FROM notes WHERE id = $1 LIMIT 1;`, [id])
  const row = res.rows[0] as any
  if (!row) return null
  return { ...row, tags: parseTags(row.tags) } as Note
}

export async function createNote(input: {
  type: NoteType
  title: string
  content?: string
  project_id?: string | null
  due_at?: string | null
  tags?: string[]
}): Promise<string> {
  const db = await getDb()
  const id = uuid()
  const ts = nowIso()

  await db.query(
    `
    INSERT INTO notes (id, type, title, content, status, due_at, project_id, tags, created_at, updated_at)
    VALUES ($1,$2,$3,$4,'open',$5,$6,$7,$8,$9);
    `,
    [
      id,
      input.type,
      input.title.trim() || '(Untitled)',
      input.content ?? '',
      input.due_at ?? null,
      input.project_id ?? null,
      stringifyTags(input.tags ?? []),
      ts,
      ts,
    ]
  )

  return id
}

export async function updateNote(
  id: string,
  patch: Partial<Pick<Note, 'title' | 'content' | 'status' | 'due_at' | 'project_id' | 'tags'>>
): Promise<void> {
  const db = await getDb()

  // normalize tags to TEXT JSON
  const normalized: any = { ...patch }
  if ('tags' in normalized) normalized.tags = stringifyTags(normalized.tags)

  const fields: string[] = []
  const values: any[] = []

  const allowed = ['title', 'content', 'status', 'due_at', 'project_id', 'tags'] as const
  for (const key of allowed) {
    if (key in normalized) {
      values.push(normalized[key])
      fields.push(`${key} = $${values.length}`)
    }
  }

  // Always bump updated_at
  values.push(nowIso())
  fields.push(`updated_at = $${values.length}`)

  values.push(id)
  await db.query(`UPDATE notes SET ${fields.join(', ')} WHERE id = $${values.length};`, values)
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDb()
  await db.query(`DELETE FROM files WHERE note_id = $1;`, [id])
  await db.query(`DELETE FROM list_items WHERE note_id = $1;`, [id])
  await db.query(`DELETE FROM notes WHERE id = $1;`, [id])
}


export async function setPinned(id: string, pinned: 0 | 1): Promise<void> {
  const db = await getDb()
  await db.query(
    `UPDATE notes SET pinned = $1, updated_at = $2 WHERE id = $3;`,
    [pinned, nowIso(), id]
  )
}
