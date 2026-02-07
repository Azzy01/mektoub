'use client'

import { v4 as uuid } from 'uuid'
import { getDb } from '../db'
import type { Note, NoteType, ProjectNodeKind, ProjectNodeRow, ProjectTaskNode } from '../types'
import { parseTags } from './tags'

function nowIso() {
  return new Date().toISOString()
}

function mapNoteRow(row: any): Note {
  return {
    ...row,
    tags: parseTags(row.tags),
  } as Note
}

export async function listProjectNodes(projectId: string): Promise<ProjectNodeRow[]> {
  const db = await getDb()
  const res = await db.query(
    `
    SELECT * FROM project_nodes
    WHERE project_id = $1
    ORDER BY parent_id IS NOT NULL, parent_id, sort_order ASC, created_at ASC;
    `,
    [projectId]
  )
  return res.rows as ProjectNodeRow[]
}

export async function listProjectTaskNotes(projectId: string): Promise<Record<string, Note>> {
  const db = await getDb()
  const res = await db.query(
    `
    SELECT n.*
    FROM notes n
    JOIN project_nodes pn ON pn.note_id = n.id
    WHERE pn.project_id = $1 AND pn.kind = 'task';
    `,
    [projectId]
  )

  const map: Record<string, Note> = {}
  for (const r of res.rows as any[]) {
    const note = mapNoteRow(r)
    map[note.id] = note
  }
  return map
}

/**
 * Returns nodes + attached task notes in 1 call (convenient for UI).
 */
export async function getProjectTree(projectId: string): Promise<{
  nodes: ProjectNodeRow[]
  taskNotesById: Record<string, Note>
}> {
  const [nodes, taskNotesById] = await Promise.all([listProjectNodes(projectId), listProjectTaskNotes(projectId)])
  return { nodes, taskNotesById }
}

export async function createProjectGroup(params: {
  projectId: string
  parentId?: string | null
  title: string
}): Promise<string> {
  const db = await getDb()
  const id = uuid()
  const ts = nowIso()

  // sort_order = max+1 under same parent
  const ordRes = await db.query(
    `
    SELECT COALESCE(MAX(sort_order), 0) AS max_order
    FROM project_nodes
    WHERE project_id = $1 AND (parent_id IS NOT DISTINCT FROM $2);
    `,
    [params.projectId, params.parentId ?? null]
  )
  const maxOrder = Number((ordRes.rows?.[0] as any)?.max_order ?? 0)

  await db.query(
    `
    INSERT INTO project_nodes (id, project_id, parent_id, kind, title, note_id, sort_order, created_at, updated_at)
    VALUES ($1,$2,$3,'group',$4,NULL,$5,$6,$7);
    `,
    [id, params.projectId, params.parentId ?? null, params.title.trim(), maxOrder + 1, ts, ts]
  )

  return id
}

export async function renameProjectGroup(groupNodeId: string, title: string): Promise<void> {
  const db = await getDb()
  await db.query(
    `UPDATE project_nodes SET title = $1, updated_at = $2 WHERE id = $3 AND kind = 'group';`,
    [title.trim(), nowIso(), groupNodeId]
  )
}

/**
 * Link an existing task note under a group (or root level if parentId null)
 */
export async function linkTaskToProject(params: {
  projectId: string
  parentId?: string | null
  noteId: string
}): Promise<string> {
  const db = await getDb()
  const id = uuid()
  const ts = nowIso()

  const ordRes = await db.query(
    `
    SELECT COALESCE(MAX(sort_order), 0) AS max_order
    FROM project_nodes
    WHERE project_id = $1 AND (parent_id IS NOT DISTINCT FROM $2);
    `,
    [params.projectId, params.parentId ?? null]
  )
  const maxOrder = Number((ordRes.rows?.[0] as any)?.max_order ?? 0)

  await db.query(
    `
    INSERT INTO project_nodes (id, project_id, parent_id, kind, title, note_id, sort_order, created_at, updated_at)
    VALUES ($1,$2,$3,'task','',$4,$5,$6,$7);
    `,
    [id, params.projectId, params.parentId ?? null, params.noteId, maxOrder + 1, ts, ts]
  )

  return id
}

/**
 * Create a NEW task note and attach it into project tree in one call.
 */
export async function createTaskInProject(params: {
  projectId: string
  parentId?: string | null
  title: string
}): Promise<{ noteId: string; nodeId: string }> {
  const db = await getDb()
  const noteId = uuid()
  const nodeId = uuid()
  const ts = nowIso()

  // create note
  await db.query(
    `
    INSERT INTO notes (
      id, type, title, content, status,
      due_at, project_id, notebook_id,
      tags, pinned, priority, urgent,
      created_at, updated_at
    )
    VALUES (
      $1,$2,$3,'','open',
      NULL,$4,NULL,
      '[]',0,3,0,
      $5,$6
    );
    `,
    [noteId, 'task' as NoteType, params.title.trim() || '(Untitled)', params.projectId, ts, ts]
  )

  // sort_order = max+1 under same parent
  const ordRes = await db.query(
    `
    SELECT COALESCE(MAX(sort_order), 0) AS max_order
    FROM project_nodes
    WHERE project_id = $1 AND (parent_id IS NOT DISTINCT FROM $2);
    `,
    [params.projectId, params.parentId ?? null]
  )
  const maxOrder = Number((ordRes.rows?.[0] as any)?.max_order ?? 0)

  // create node
  await db.query(
    `
    INSERT INTO project_nodes (id, project_id, parent_id, kind, title, note_id, sort_order, created_at, updated_at)
    VALUES ($1,$2,$3,'task','',$4,$5,$6,$7);
    `,
    [nodeId, params.projectId, params.parentId ?? null, noteId, maxOrder + 1, ts, ts]
  )

  return { noteId, nodeId }
}

/**
 * Delete a node. If it's a group, delete subtree nodes.
 * Notes are NOT deleted (tasks remain as notes) — safer for MVP.
 */
export async function deleteProjectNode(nodeId: string): Promise<void> {
  const db = await getDb()

  // Load subtree using a recursive CTE
  const res = await db.query(
    `
    WITH RECURSIVE subtree AS (
      SELECT id FROM project_nodes WHERE id = $1
      UNION ALL
      SELECT pn.id
      FROM project_nodes pn
      JOIN subtree s ON pn.parent_id = s.id
    )
    SELECT id FROM subtree;
    `,
    [nodeId]
  )

  const ids = (res.rows as any[]).map((r) => r.id)
  if (ids.length === 0) return

  // Delete nodes (children first not required in SQL if no FK constraints)
  // Build placeholders: $1,$2...
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')
  await db.query(`DELETE FROM project_nodes WHERE id IN (${placeholders});`, ids)
}


export async function deleteTaskNodeAndNote(nodeId: string): Promise<void> {
  const db = await getDb()

  // find note id first
  const res = await db.query(`SELECT note_id FROM project_nodes WHERE id = $1 AND kind='task' LIMIT 1;`, [nodeId])
  const noteId = (res.rows?.[0] as any)?.note_id as string | undefined

  // delete node
  await db.query(`DELETE FROM project_nodes WHERE id = $1;`, [nodeId])

  // delete note (safe: only if exists)
  if (noteId) {
    await db.query(`DELETE FROM files WHERE note_id = $1;`, [noteId])
    await db.query(`DELETE FROM list_items WHERE note_id = $1;`, [noteId])
    await db.query(`DELETE FROM notes WHERE id = $1;`, [noteId])
  }
}
