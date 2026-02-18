'use client'

import { v4 as uuid } from 'uuid'
import { getDb } from '../../db'
import type { FinanceCategory, FinanceSubcategory } from '../../types'

function nowIso() {
  return new Date().toISOString()
}

function normalizeName(value: string) {
  return value.trim()
}

async function categoryById(id: string): Promise<FinanceCategory | null> {
  const db = await getDb()
  const res = await db.query(`SELECT * FROM finance_categories WHERE id = $1 LIMIT 1;`, [id])
  return (res.rows?.[0] as FinanceCategory | undefined) ?? null
}

export async function listFinanceCategories(): Promise<FinanceCategory[]> {
  const db = await getDb()
  const res = await db.query(`SELECT * FROM finance_categories ORDER BY LOWER(name) ASC;`)
  return res.rows as FinanceCategory[]
}

export async function listFinanceSubcategories(categoryId?: string | null): Promise<FinanceSubcategory[]> {
  const db = await getDb()
  if (categoryId) {
    const res = await db.query(
      `SELECT * FROM finance_subcategories WHERE category_id = $1 ORDER BY LOWER(name) ASC;`,
      [categoryId]
    )
    return res.rows as FinanceSubcategory[]
  }

  const res = await db.query(
    `
    SELECT s.*
    FROM finance_subcategories s
    JOIN finance_categories c ON c.id = s.category_id
    ORDER BY LOWER(c.name) ASC, LOWER(s.name) ASC;
    `
  )
  return res.rows as FinanceSubcategory[]
}

export async function createFinanceCategory(name: string): Promise<string> {
  const clean = normalizeName(name)
  if (!clean) throw new Error('Category name is required')

  const db = await getDb()
  const exists = await db.query(
    `SELECT id FROM finance_categories WHERE LOWER(name) = LOWER($1) LIMIT 1;`,
    [clean]
  )
  if ((exists.rows as Array<{ id: string }>).length > 0) {
    throw new Error('Category with this name already exists')
  }

  const id = uuid()
  const ts = nowIso()
  await db.query(
    `
    INSERT INTO finance_categories (id, name, created_at, updated_at)
    VALUES ($1, $2, $3, $4);
    `,
    [id, clean, ts, ts]
  )
  return id
}

export async function renameFinanceCategory(id: string, name: string): Promise<void> {
  const clean = normalizeName(name)
  if (!clean) throw new Error('Category name is required')

  const db = await getDb()
  const existing = await db.query(
    `
    SELECT id
    FROM finance_categories
    WHERE LOWER(name) = LOWER($1) AND id <> $2
    LIMIT 1;
    `,
    [clean, id]
  )
  if ((existing.rows as Array<{ id: string }>).length > 0) {
    throw new Error('Category with this name already exists')
  }

  await db.query(
    `UPDATE finance_categories SET name = $1, updated_at = $2 WHERE id = $3;`,
    [clean, nowIso(), id]
  )
}

export async function deleteFinanceCategory(id: string): Promise<void> {
  const db = await getDb()

  const usage = await db.query(
    `SELECT COUNT(1) AS cnt FROM finance_expenses WHERE category_id = $1;`,
    [id]
  )
  const used = Number((usage.rows?.[0] as { cnt?: number | string } | undefined)?.cnt ?? 0)
  if (used > 0) {
    throw new Error('Cannot delete category referenced by expenses')
  }

  await db.exec('BEGIN;')
  try {
    await db.query(`DELETE FROM finance_subcategories WHERE category_id = $1;`, [id])
    await db.query(`DELETE FROM finance_categories WHERE id = $1;`, [id])
    await db.exec('COMMIT;')
  } catch (err) {
    await db.exec('ROLLBACK;')
    throw err
  }
}

export async function createFinanceSubcategory(categoryId: string, name: string): Promise<string> {
  const clean = normalizeName(name)
  if (!clean) throw new Error('Subcategory name is required')

  const category = await categoryById(categoryId)
  if (!category) throw new Error('Category not found')

  const db = await getDb()
  const duplicate = await db.query(
    `
    SELECT id
    FROM finance_subcategories
    WHERE category_id = $1 AND LOWER(name) = LOWER($2)
    LIMIT 1;
    `,
    [categoryId, clean]
  )
  if ((duplicate.rows as Array<{ id: string }>).length > 0) {
    throw new Error('Subcategory with this name already exists in this category')
  }

  const id = uuid()
  const ts = nowIso()
  await db.query(
    `
    INSERT INTO finance_subcategories (id, category_id, name, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5);
    `,
    [id, categoryId, clean, ts, ts]
  )
  return id
}

export async function renameFinanceSubcategory(id: string, name: string): Promise<void> {
  const clean = normalizeName(name)
  if (!clean) throw new Error('Subcategory name is required')

  const db = await getDb()
  const currentRes = await db.query(
    `SELECT category_id FROM finance_subcategories WHERE id = $1 LIMIT 1;`,
    [id]
  )
  const row = (currentRes.rows?.[0] as { category_id?: string } | undefined) ?? null
  if (!row?.category_id) throw new Error('Subcategory not found')

  const duplicate = await db.query(
    `
    SELECT id
    FROM finance_subcategories
    WHERE category_id = $1 AND LOWER(name) = LOWER($2) AND id <> $3
    LIMIT 1;
    `,
    [row.category_id, clean, id]
  )
  if ((duplicate.rows as Array<{ id: string }>).length > 0) {
    throw new Error('Subcategory with this name already exists in this category')
  }

  await db.query(
    `UPDATE finance_subcategories SET name = $1, updated_at = $2 WHERE id = $3;`,
    [clean, nowIso(), id]
  )
}

export async function deleteFinanceSubcategory(id: string): Promise<void> {
  const db = await getDb()
  const usage = await db.query(
    `SELECT COUNT(1) AS cnt FROM finance_expenses WHERE subcategory_id = $1;`,
    [id]
  )
  const used = Number((usage.rows?.[0] as { cnt?: number | string } | undefined)?.cnt ?? 0)
  if (used > 0) {
    throw new Error('Cannot delete subcategory referenced by expenses')
  }

  await db.query(`DELETE FROM finance_subcategories WHERE id = $1;`, [id])
}
