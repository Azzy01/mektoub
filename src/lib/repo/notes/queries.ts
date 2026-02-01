'use client'

import type { ListNotesParams } from './types'

export function buildListNotesWhere(params?: ListNotesParams) {
  const type = params?.type ?? 'all'
  const q = (params?.q ?? '').trim()
  const projectId = params?.projectId ?? 'all'
  const status = params?.status ?? 'all'
  const notebookId = params?.notebookId ?? 'all'

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
    if (projectId === 'none') where.push(`project_id IS NULL`)
    else {
      values.push(projectId)
      where.push(`project_id = $${values.length}`)
    }
  }

  if (notebookId !== 'all') {
    if (notebookId === 'none') where.push(`notebook_id IS NULL`)
    else {
      values.push(notebookId)
      where.push(`notebook_id = $${values.length}`)
    }
  }

  if (q) {
    values.push(`%${q.toLowerCase()}%`)
    where.push(`(LOWER(title) LIKE $${values.length} OR LOWER(content) LIKE $${values.length})`)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  return { whereSql, values }
}
