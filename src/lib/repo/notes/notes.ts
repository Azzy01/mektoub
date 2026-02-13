'use client'

import { v4 as uuid } from 'uuid'
import { getDb } from '../../db'
import type { Note, NoteType } from '../../types'
import { stringifyTags } from '../tags'
import type { ListNotesParams } from './types'
import { buildListNotesWhere } from './queries'
import { mapNoteRow } from './mapper'
import { markManyDeleted } from '../tombstones'

function nowIso() {
  return new Date().toISOString()
}

export async function listNotes(params?: ListNotesParams): Promise<Note[]> {
  const db = await getDb()
  const { whereSql, values } = buildListNotesWhere(params)

  const res = await db.query(
    `
    SELECT * FROM notes
    ${whereSql}
    ORDER BY pinned DESC, urgent DESC, priority ASC, updated_at DESC
    LIMIT 500;
    `,
    values
  )

  return (res.rows as any[]).map(mapNoteRow) as Note[]
}

export async function getNote(id: string): Promise<Note | null> {
  const db = await getDb()
  const res = await db.query(`SELECT * FROM notes WHERE id = $1 LIMIT 1;`, [id])
  const row = res.rows[0] as any
  if (!row) return null
  return mapNoteRow(row)
}

export async function createNote(input: {
  type: NoteType
  title: string
  content?: string
  project_id?: string | null
  notebook_id?: string | null
  due_at?: string | null
  tags?: string[]
  is_private?: 0 | 1
  priority?: number
  urgent?: 0 | 1
}): Promise<string> {
  const db = await getDb()
  const id = uuid()
  const ts = nowIso()
  const startAt = input.type === 'task' ? ts : null

  await db.query(
    `
    INSERT INTO notes (
      id, type, title, content, status,
      due_at, project_id, notebook_id,
      tags, pinned, priority, urgent, is_private,
      start_at, completed_at,
      created_at, updated_at
    )
    VALUES (
      $1,$2,$3,$4,'open',
      $5,$6,$7,
      $8,$9,$10,$11,$12,
      $13,$14,
      $15,$16
    );
    `,
    [
      id,
      input.type,
      input.title.trim() || '(Untitled)',
      input.content ?? '',
      input.due_at ?? null,
      input.project_id ?? null,
      input.notebook_id ?? null,
      stringifyTags(input.tags ?? []),
      0, // pinned default
      input.priority ?? 3,
      input.urgent ?? 0,
      input.is_private ?? 0,
      startAt,
      null,
      ts,
      ts,
    ]
  )

  return id
}

export async function updateNote(
  id: string,

  patch: Partial<
  Pick<Note,
    'title' | 'content' | 'status' | 'due_at' |
    'project_id' | 'notebook_id' | 'tags' |
    'pinned' | 'priority' | 'urgent' | 'is_private'
  >
>

): Promise<void> {
  const db = await getDb()

  const normalized: any = { ...patch }
  if ('tags' in normalized) normalized.tags = stringifyTags(normalized.tags)

  const fields: string[] = []
  const values: any[] = []

  const allowed = ['title','content','status','due_at','project_id','notebook_id','tags','pinned','priority','urgent','is_private','completed_at'] as const

  for (const key of allowed) {
    if (key in normalized) {
      values.push(normalized[key])
      fields.push(`${key} = $${values.length}`)
    }
  }

  if ('status' in normalized) {
    if (normalized.status === 'done') {
      values.push(nowIso())
      fields.push(`completed_at = $${values.length}`)
    }
    if (normalized.status === 'open') {
      values.push(null)
      fields.push(`completed_at = $${values.length}`)
    }
  }

  values.push(nowIso())
  fields.push(`updated_at = $${values.length}`)

  values.push(id)
  await db.query(`UPDATE notes SET ${fields.join(', ')} WHERE id = $${values.length};`, values)
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDb()

  const filesRes = await db.query(`SELECT id FROM files WHERE note_id = $1;`, [id])
  const listItemsRes = await db.query(`SELECT id FROM list_items WHERE note_id = $1;`, [id])
  const nodeRes = await db.query(`SELECT id FROM project_nodes WHERE note_id = $1 OR project_id = $1;`, [id])

  const fileIds = (filesRes.rows as Array<{ id: string }>).map((r) => r.id)
  const listItemIds = (listItemsRes.rows as Array<{ id: string }>).map((r) => r.id)
  const nodeIds = (nodeRes.rows as Array<{ id: string }>).map((r) => r.id)

  await db.query(`DELETE FROM files WHERE note_id = $1;`, [id])
  await db.query(`DELETE FROM list_items WHERE note_id = $1;`, [id])
  await db.query(`DELETE FROM project_nodes WHERE note_id = $1 OR project_id = $1;`, [id])
  await db.query(`UPDATE notes SET project_id = NULL, updated_at = $1 WHERE project_id = $2;`, [nowIso(), id])
  await db.query(`DELETE FROM notes WHERE id = $1;`, [id])

  await markManyDeleted([
    ...fileIds.map((rowId) => ({ table: 'files' as const, rowId })),
    ...listItemIds.map((rowId) => ({ table: 'list_items' as const, rowId })),
    ...nodeIds.map((rowId) => ({ table: 'project_nodes' as const, rowId })),
    { table: 'notes' as const, rowId: id },
  ])
}

export async function setPinned(id: string, pinned: 0 | 1): Promise<void> {
  const db = await getDb()
  await db.query(`UPDATE notes SET pinned = $1, updated_at = $2 WHERE id = $3;`, [pinned, nowIso(), id])
}
