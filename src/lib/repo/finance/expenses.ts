'use client'

import { v4 as uuid } from 'uuid'
import { getDb } from '../../db'
import type { FinanceExpense, FinanceExpenseWithRefs } from '../../types'
import { parseTags, stringifyTags } from '../tags'

function nowIso() {
  return new Date().toISOString()
}

export function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function normalizeMonth(value?: string) {
  const month = (value ?? '').trim()
  if (/^\d{4}-\d{2}$/.test(month)) return month
  return currentMonthKey()
}

function getMonthRange(value?: string) {
  const monthKey = normalizeMonth(value)
  const [yearPart, monthPart] = monthKey.split('-')
  const year = Number(yearPart)
  const month = Number(monthPart)
  const start = `${yearPart}-${monthPart}-01`
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const endExclusive = `${String(nextYear)}-${String(nextMonth).padStart(2, '0')}-01`
  return { start, endExclusive }
}

function normalizeDate(value?: string) {
  const raw = (value ?? '').trim()
  if (!raw) return nowIso()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) throw new Error('Date is invalid')
  return d.toISOString()
}

function normalizeTitle(value: string) {
  const clean = value.trim()
  if (!clean) throw new Error('Title is required')
  return clean
}

function normalizeAmount(value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('Amount must be a positive integer')
  }
  return value
}

async function ensureCategoryAndSubcategory(
  categoryId: string,
  subcategoryId: string | null | undefined
) {
  if (!categoryId) throw new Error('Category is required')

  const db = await getDb()
  const catRes = await db.query(`SELECT id FROM finance_categories WHERE id = $1 LIMIT 1;`, [categoryId])
  if ((catRes.rows as Array<{ id: string }>).length === 0) {
    throw new Error('Category not found')
  }

  if (!subcategoryId) return

  const subRes = await db.query(
    `
    SELECT id
    FROM finance_subcategories
    WHERE id = $1 AND category_id = $2
    LIMIT 1;
    `,
    [subcategoryId, categoryId]
  )
  if ((subRes.rows as Array<{ id: string }>).length === 0) {
    throw new Error('Subcategory must belong to selected category')
  }
}

function mapExpenseRow(row: any): FinanceExpenseWithRefs {
  return {
    id: String(row.id),
    date: String(row.date),
    title: String(row.title),
    amount: Number(row.amount),
    category_id: String(row.category_id),
    subcategory_id: row.subcategory_id ? String(row.subcategory_id) : null,
    note: String(row.note ?? ''),
    tags: parseTags(row.tags),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    category_name: String(row.category_name),
    subcategory_name: row.subcategory_name ? String(row.subcategory_name) : null,
  }
}

export type FinanceExpenseFilters = {
  month?: string
  categoryId?: string | 'all'
  subcategoryId?: string | 'all'
  q?: string
}

export async function listFinanceExpenses(
  filters?: FinanceExpenseFilters
): Promise<FinanceExpenseWithRefs[]> {
  const db = await getDb()
  const monthRange = getMonthRange(filters?.month)
  const values: any[] = []
  const where: string[] = []

  values.push(monthRange.start)
  where.push(`e.date >= $${values.length}`)
  values.push(monthRange.endExclusive)
  where.push(`e.date < $${values.length}`)

  if (filters?.categoryId && filters.categoryId !== 'all') {
    values.push(filters.categoryId)
    where.push(`e.category_id = $${values.length}`)
  }

  if (filters?.subcategoryId && filters.subcategoryId !== 'all') {
    values.push(filters.subcategoryId)
    where.push(`e.subcategory_id = $${values.length}`)
  }

  const q = (filters?.q ?? '').trim().toLowerCase()
  if (q) {
    values.push(`%${q}%`)
    where.push(`(LOWER(e.title) LIKE $${values.length} OR LOWER(e.note) LIKE $${values.length})`)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const res = await db.query(
    `
    SELECT
      e.*,
      c.name AS category_name,
      s.name AS subcategory_name
    FROM finance_expenses e
    JOIN finance_categories c ON c.id = e.category_id
    LEFT JOIN finance_subcategories s ON s.id = e.subcategory_id
    ${whereSql}
    ORDER BY e.date DESC, e.created_at DESC;
    `,
    values
  )

  return (res.rows as any[]).map(mapExpenseRow)
}

export type FinanceExpenseInput = {
  date?: string
  title: string
  amount: number
  category_id: string
  subcategory_id?: string | null
  note?: string
  tags?: string[]
}

export async function createFinanceExpense(input: FinanceExpenseInput): Promise<string> {
  const db = await getDb()
  const id = uuid()
  const ts = nowIso()

  const date = normalizeDate(input.date)
  const title = normalizeTitle(input.title)
  const amount = normalizeAmount(input.amount)
  const note = input.note?.trim() ?? ''
  const subcategoryId = input.subcategory_id ?? null
  const tags = stringifyTags(input.tags ?? [])

  await ensureCategoryAndSubcategory(input.category_id, subcategoryId)

  await db.query(
    `
    INSERT INTO finance_expenses (
      id, date, title, amount, category_id, subcategory_id,
      note, tags, created_at, updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10
    );
    `,
    [id, date, title, amount, input.category_id, subcategoryId, note, tags, ts, ts]
  )

  return id
}

export async function updateFinanceExpense(id: string, input: FinanceExpenseInput): Promise<void> {
  const db = await getDb()
  const date = normalizeDate(input.date)
  const title = normalizeTitle(input.title)
  const amount = normalizeAmount(input.amount)
  const note = input.note?.trim() ?? ''
  const subcategoryId = input.subcategory_id ?? null
  const tags = stringifyTags(input.tags ?? [])

  await ensureCategoryAndSubcategory(input.category_id, subcategoryId)

  await db.query(
    `
    UPDATE finance_expenses
    SET
      date = $1,
      title = $2,
      amount = $3,
      category_id = $4,
      subcategory_id = $5,
      note = $6,
      tags = $7,
      updated_at = $8
    WHERE id = $9;
    `,
    [date, title, amount, input.category_id, subcategoryId, note, tags, nowIso(), id]
  )
}

export async function deleteFinanceExpense(id: string): Promise<void> {
  const db = await getDb()
  await db.query(`DELETE FROM finance_expenses WHERE id = $1;`, [id])
}

export async function getFinanceMonthSummary(month?: string): Promise<{
  total: number
  topCategories: Array<{ category_id: string; category_name: string; amount: number }>
}> {
  const db = await getDb()
  const monthRange = getMonthRange(month)

  const totalRes = await db.query(
    `
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM finance_expenses
    WHERE date >= $1 AND date < $2;
    `,
    [monthRange.start, monthRange.endExclusive]
  )
  const total = Number((totalRes.rows?.[0] as { total?: number | string } | undefined)?.total ?? 0)

  const topRes = await db.query(
    `
    SELECT
      e.category_id,
      c.name AS category_name,
      SUM(e.amount) AS amount
    FROM finance_expenses e
    JOIN finance_categories c ON c.id = e.category_id
    WHERE e.date >= $1 AND e.date < $2
    GROUP BY e.category_id, c.name
    ORDER BY SUM(e.amount) DESC
    LIMIT 5;
    `,
    [monthRange.start, monthRange.endExclusive]
  )

  const topCategories = (topRes.rows as any[]).map((row) => ({
    category_id: String(row.category_id),
    category_name: String(row.category_name),
    amount: Number(row.amount),
  }))

  return { total, topCategories }
}

export async function getFinanceExpense(id: string): Promise<FinanceExpense | null> {
  const db = await getDb()
  const res = await db.query(`SELECT * FROM finance_expenses WHERE id = $1 LIMIT 1;`, [id])
  const row = (res.rows?.[0] as any) ?? null
  if (!row) return null
  return {
    id: String(row.id),
    date: String(row.date),
    title: String(row.title),
    amount: Number(row.amount),
    category_id: String(row.category_id),
    subcategory_id: row.subcategory_id ? String(row.subcategory_id) : null,
    note: String(row.note ?? ''),
    tags: parseTags(row.tags),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}
