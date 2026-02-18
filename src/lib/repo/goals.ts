'use client'

import { v4 as uuid } from 'uuid'
import { getDb } from '../db'
import type { Goal, GoalStatus } from '../types'

function nowIso() {
  return new Date().toISOString()
}

function normalizeDate(raw: string, label: string) {
  const value = (raw ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be in YYYY-MM-DD format`)
  }
  return value
}

function toDateValue(value: string) {
  const dt = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(dt.getTime())) throw new Error('Date is invalid')
  return dt.getTime()
}

function normalizeStatus(raw: string): GoalStatus {
  const value = raw as GoalStatus
  if (value !== 'open' && value !== 'done' && value !== 'archived') {
    throw new Error('Invalid status')
  }
  return value
}

function normalizeProgress(value: number) {
  if (!Number.isFinite(value)) throw new Error('Progress must be a number')
  const rounded = Math.round(value)
  if (rounded < 0 || rounded > 100) throw new Error('Progress must be between 0 and 100')
  return rounded
}

function normalizeColor(raw?: string | null) {
  const value = (raw ?? '').trim()
  if (!value) return null
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error('Color must be a hex value like #22c55e')
  }
  return value
}

function mapGoal(row: any): Goal {
  return {
    id: String(row.id),
    parent_id: row.parent_id ? String(row.parent_id) : null,
    title: String(row.title),
    description: String(row.description ?? ''),
    status: normalizeStatus(String(row.status)),
    progress: Number(row.progress),
    start_date: String(row.start_date),
    end_date: String(row.end_date),
    color: row.color ? String(row.color) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

async function ensureParentExists(parentId: string | null, selfId?: string) {
  if (!parentId) return
  if (selfId && parentId === selfId) throw new Error('Goal cannot be parent of itself')

  const db = await getDb()
  const res = await db.query(`SELECT id, parent_id FROM goals WHERE id = $1 LIMIT 1;`, [parentId])
  const row = (res.rows?.[0] as { id?: string; parent_id?: string | null } | undefined) ?? null
  if (!row?.id) throw new Error('Parent goal not found')

  if (!selfId) return

  let current: string | null = row.parent_id ?? null
  while (current) {
    if (current === selfId) {
      throw new Error('This parent relation would create a cycle')
    }
    const parentRes = await db.query(`SELECT parent_id FROM goals WHERE id = $1 LIMIT 1;`, [current])
    const parentRow =
      (parentRes.rows?.[0] as { parent_id?: string | null } | undefined) ?? null
    current = parentRow?.parent_id ?? null
  }
}

export async function listGoals(params?: {
  status?: GoalStatus | 'all'
  q?: string
}): Promise<Goal[]> {
  const db = await getDb()
  const where: string[] = []
  const values: any[] = []

  if (params?.status && params.status !== 'all') {
    values.push(params.status)
    where.push(`status = $${values.length}`)
  }

  const q = (params?.q ?? '').trim().toLowerCase()
  if (q) {
    values.push(`%${q}%`)
    where.push(
      `(LOWER(title) LIKE $${values.length} OR LOWER(description) LIKE $${values.length})`
    )
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const res = await db.query(
    `
    SELECT *
    FROM goals
    ${whereSql}
    ORDER BY start_date ASC, created_at ASC;
    `,
    values
  )
  return (res.rows as any[]).map(mapGoal)
}

export async function getGoal(id: string): Promise<Goal | null> {
  const db = await getDb()
  const res = await db.query(`SELECT * FROM goals WHERE id = $1 LIMIT 1;`, [id])
  const row = (res.rows?.[0] as any) ?? null
  if (!row) return null
  return mapGoal(row)
}

export async function createGoal(input: {
  title: string
  start_date: string
  end_date: string
  parent_id?: string | null
  description?: string
  status?: GoalStatus
  progress?: number
  color?: string | null
}): Promise<string> {
  const title = (input.title ?? '').trim()
  if (!title) throw new Error('Title is required')

  const startDate = normalizeDate(input.start_date, 'Start date')
  const endDate = normalizeDate(input.end_date, 'End date')
  if (toDateValue(endDate) < toDateValue(startDate)) {
    throw new Error('End date must be on or after start date')
  }

  const parentId = input.parent_id ?? null
  await ensureParentExists(parentId)

  const status = normalizeStatus(input.status ?? 'open')
  const progress = normalizeProgress(input.progress ?? 0)
  const color = normalizeColor(input.color)
  const description = (input.description ?? '').trim()

  const db = await getDb()
  const id = uuid()
  const ts = nowIso()
  await db.query(
    `
    INSERT INTO goals (
      id, parent_id, title, description, status, progress,
      start_date, end_date, color, created_at, updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11);
    `,
    [id, parentId, title, description, status, progress, startDate, endDate, color, ts, ts]
  )
  return id
}

export async function updateGoal(
  id: string,
  patch: Partial<{
    parent_id: string | null
    title: string
    description: string
    status: GoalStatus
    progress: number
    start_date: string
    end_date: string
    color: string | null
  }>
): Promise<void> {
  const current = await getGoal(id)
  if (!current) throw new Error('Goal not found')

  const nextTitle = patch.title !== undefined ? patch.title.trim() : current.title
  if (!nextTitle) throw new Error('Title is required')

  const nextStartDate =
    patch.start_date !== undefined
      ? normalizeDate(patch.start_date, 'Start date')
      : current.start_date
  const nextEndDate =
    patch.end_date !== undefined ? normalizeDate(patch.end_date, 'End date') : current.end_date
  if (toDateValue(nextEndDate) < toDateValue(nextStartDate)) {
    throw new Error('End date must be on or after start date')
  }

  const nextParentId =
    patch.parent_id !== undefined ? patch.parent_id : current.parent_id
  await ensureParentExists(nextParentId ?? null, id)

  const nextStatus =
    patch.status !== undefined ? normalizeStatus(patch.status) : current.status
  const nextProgress =
    patch.progress !== undefined ? normalizeProgress(patch.progress) : current.progress
  const nextDescription =
    patch.description !== undefined ? patch.description.trim() : current.description
  const nextColor = patch.color !== undefined ? normalizeColor(patch.color) : current.color

  const db = await getDb()
  await db.query(
    `
    UPDATE goals
    SET
      parent_id = $1,
      title = $2,
      description = $3,
      status = $4,
      progress = $5,
      start_date = $6,
      end_date = $7,
      color = $8,
      updated_at = $9
    WHERE id = $10;
    `,
    [
      nextParentId,
      nextTitle,
      nextDescription,
      nextStatus,
      nextProgress,
      nextStartDate,
      nextEndDate,
      nextColor,
      nowIso(),
      id,
    ]
  )
}

export async function deleteGoal(id: string): Promise<void> {
  const db = await getDb()
  const childRes = await db.query(`SELECT COUNT(1) AS cnt FROM goals WHERE parent_id = $1;`, [id])
  const children = Number(
    (childRes.rows?.[0] as { cnt?: number | string } | undefined)?.cnt ?? 0
  )
  if (children > 0) {
    throw new Error('Delete sub-goals first')
  }

  await db.query(`DELETE FROM goals WHERE id = $1;`, [id])
}
