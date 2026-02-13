'use client'

import { v4 as uuid } from 'uuid'
import { getDb } from '../db'
import type { BlogCategory, BlogFile, BlogPost, BlogPostStatus } from '../types'
import { markDeleted, markManyDeleted } from './tombstones'

function nowIso() {
  return new Date().toISOString()
}

function slugify(input: string) {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return cleaned || 'post'
}

export async function listBlogCategories(): Promise<BlogCategory[]> {
  const db = await getDb()
  const res = await db.query(`SELECT * FROM blog_categories ORDER BY name ASC;`)
  return res.rows as BlogCategory[]
}

export async function listBlogCategoryCounts(): Promise<Record<string, number>> {
  const db = await getDb()
  const res = await db.query(
    `
    SELECT category_id, COUNT(1) AS cnt
    FROM blog_posts
    GROUP BY category_id;
    `
  )
  const map: Record<string, number> = {}
  for (const r of res.rows as any[]) {
    map[r.category_id] = Number(r.cnt || 0)
  }
  return map
}

export async function createBlogCategory(name: string): Promise<string> {
  const db = await getDb()
  const id = uuid()
  const ts = nowIso()
  const n = name.trim()
  if (!n) throw new Error('Category name is required')
  await db.query(
    `
    INSERT INTO blog_categories (id, name, created_at)
    VALUES ($1,$2,$3);
    `,
    [id, n, ts]
  )
  return id
}

export async function updateBlogCategory(id: string, name: string): Promise<void> {
  const db = await getDb()
  const n = name.trim()
  if (!n) throw new Error('Category name is required')
  await db.query(`UPDATE blog_categories SET name = $1 WHERE id = $2;`, [n, id])
}

export async function deleteBlogCategory(id: string): Promise<void> {
  const db = await getDb()
  const res = await db.query(`SELECT COUNT(1) AS cnt FROM blog_posts WHERE category_id = $1;`, [id])
  const cnt = Number((res.rows?.[0] as any)?.cnt ?? 0)
  if (cnt > 0) {
    throw new Error('Cannot delete category with posts')
  }
  await db.query(`DELETE FROM blog_categories WHERE id = $1;`, [id])
  await markDeleted('blog_categories', id)
}

export async function listBlogPosts(params?: {
  categoryId?: string | null
  status?: BlogPostStatus | 'all'
}): Promise<BlogPost[]> {
  const db = await getDb()
  const values: any[] = []
  const where: string[] = []

  if (params?.categoryId) {
    values.push(params.categoryId)
    where.push(`p.category_id = $${values.length}`)
  }

  if (params?.status && params.status !== 'all') {
    values.push(params.status)
    where.push(`p.status = $${values.length}`)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const res = await db.query(
    `
    SELECT
      p.*,
      c.name AS category_name,
      f.id AS cover_id,
      f.filename AS cover_filename,
      f.mime AS cover_mime,
      f.size AS cover_size,
      f.data_base64 AS cover_data_base64,
      f.role AS cover_role,
      f.created_at AS cover_created_at
    FROM blog_posts p
    JOIN blog_categories c ON c.id = p.category_id
    LEFT JOIN blog_files f ON f.id = p.cover_file_id
    ${whereSql}
    ORDER BY p.updated_at DESC
    LIMIT 200;
    `,
    values
  )

  return (res.rows as any[]).map(mapPostRow)
}

export async function getBlogPost(id: string): Promise<BlogPost | null> {
  const db = await getDb()
  const res = await db.query(
    `
    SELECT
      p.*,
      c.name AS category_name,
      f.id AS cover_id,
      f.filename AS cover_filename,
      f.mime AS cover_mime,
      f.size AS cover_size,
      f.data_base64 AS cover_data_base64,
      f.role AS cover_role,
      f.created_at AS cover_created_at
    FROM blog_posts p
    JOIN blog_categories c ON c.id = p.category_id
    LEFT JOIN blog_files f ON f.id = p.cover_file_id
    WHERE p.id = $1
    LIMIT 1;
    `,
    [id]
  )
  const row = (res.rows as any[])[0]
  if (!row) return null
  return mapPostRow(row)
}

export async function createBlogPost(input: {
  title: string
  slug?: string
  category_id: string
  excerpt: string
  content: string
  coverFile?: File | null
  inlineFiles?: File[]
  status?: BlogPostStatus
}): Promise<string> {
  const db = await getDb()
  const id = uuid()
  const ts = nowIso()

  const title = input.title.trim() || '(Untitled)'
  const slug = (input.slug ? slugify(input.slug) : slugify(title)) || `${id.slice(0, 8)}`
  const excerpt = (input.excerpt || '').slice(0, 300)
  const content = input.content || ''
  const status = input.status || 'draft'

  await db.query(
    `
    INSERT INTO blog_posts (
      id, title, slug, category_id,
      excerpt, content, cover_file_id,
      status, created_at, updated_at, published_at
    )
    VALUES (
      $1,$2,$3,$4,
      $5,$6,$7,
      $8,$9,$10,$11
    );
    `,
    [
      id,
      title,
      slug,
      input.category_id,
      excerpt,
      content,
      null,
      status,
      ts,
      ts,
      status === 'published' ? ts : null,
    ]
  )

  if (input.coverFile) {
    const coverId = await attachBlogFile(id, input.coverFile, 'cover')
    await db.query(`UPDATE blog_posts SET cover_file_id = $1, updated_at = $2 WHERE id = $3;`, [
      coverId,
      nowIso(),
      id,
    ])
  }

  if (input.inlineFiles && input.inlineFiles.length > 0) {
    for (const f of input.inlineFiles) {
      await attachBlogFile(id, f, 'inline')
    }
  }

  return id
}

function mapPostRow(row: any): BlogPost {
  const cover_file: BlogFile | null =
    row.cover_id
      ? {
          id: row.cover_id,
          post_id: row.id,
          filename: row.cover_filename,
          mime: row.cover_mime,
          size: row.cover_size,
          data_base64: row.cover_data_base64,
          role: row.cover_role,
          created_at: row.cover_created_at,
        }
      : null

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category_id: row.category_id,
    excerpt: row.excerpt,
    content: row.content,
    cover_file_id: row.cover_file_id,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    published_at: row.published_at,
    category_name: row.category_name,
    cover_file,
  } as BlogPost
}

export async function updateBlogPost(
  id: string,
  patch: {
    title?: string
    slug?: string
    category_id?: string
    excerpt?: string
    content?: string
    status?: BlogPostStatus
    coverFile?: File | null
    inlineFiles?: File[]
  }
): Promise<void> {
  const db = await getDb()
  const fields: string[] = []
  const values: any[] = []

  function pushField(name: string, value: any) {
    values.push(value)
    fields.push(`${name} = $${values.length}`)
  }

  if (patch.title !== undefined) pushField('title', patch.title.trim() || '(Untitled)')
  if (patch.slug !== undefined) {
    const raw = patch.slug.trim()
    if (raw) pushField('slug', slugify(raw))
  }
  if (patch.category_id !== undefined) pushField('category_id', patch.category_id)
  if (patch.excerpt !== undefined) pushField('excerpt', (patch.excerpt || '').slice(0, 300))
  if (patch.content !== undefined) pushField('content', patch.content || '')
  if (patch.status !== undefined) {
    pushField('status', patch.status)
    if (patch.status === 'published') {
      pushField('published_at', nowIso())
    }
  }

  if (fields.length > 0) {
    values.push(nowIso())
    fields.push(`updated_at = $${values.length}`)
    values.push(id)
    await db.query(`UPDATE blog_posts SET ${fields.join(', ')} WHERE id = $${values.length};`, values)
  }

  if (patch.coverFile) {
    const coverId = await attachBlogFile(id, patch.coverFile, 'cover')
    await db.query(`UPDATE blog_posts SET cover_file_id = $1, updated_at = $2 WHERE id = $3;`, [
      coverId,
      nowIso(),
      id,
    ])
  }

  if (patch.inlineFiles && patch.inlineFiles.length > 0) {
    for (const f of patch.inlineFiles) {
      await attachBlogFile(id, f, 'inline')
    }
    await db.query(`UPDATE blog_posts SET updated_at = $1 WHERE id = $2;`, [nowIso(), id])
  }
}

export async function deleteBlogPost(id: string): Promise<void> {
  const db = await getDb()
  const filesRes = await db.query(`SELECT id FROM blog_files WHERE post_id = $1;`, [id])
  const fileIds = (filesRes.rows as Array<{ id: string }>).map((r) => r.id)
  await db.query(`DELETE FROM blog_files WHERE post_id = $1;`, [id])
  await db.query(`DELETE FROM blog_posts WHERE id = $1;`, [id])
  await markManyDeleted([
    ...fileIds.map((rowId) => ({ table: 'blog_files' as const, rowId })),
    { table: 'blog_posts' as const, rowId: id },
  ])
}

export async function attachBlogFile(
  postId: string,
  file: File,
  role: 'cover' | 'inline'
): Promise<string> {
  const db = await getDb()
  const id = uuid()
  const ts = nowIso()
  const data_base64 = await fileToBase64(file)

  await db.query(
    `
    INSERT INTO blog_files (id, post_id, filename, mime, size, data_base64, role, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8);
    `,
    [id, postId, file.name, file.type || 'application/octet-stream', file.size, data_base64, role, ts]
  )

  return id
}

export async function listBlogFiles(postId: string, role?: 'cover' | 'inline'): Promise<BlogFile[]> {
  const db = await getDb()
  const values: any[] = [postId]
  let where = 'post_id = $1'
  if (role) {
    values.push(role)
    where += ` AND role = $${values.length}`
  }
  const res = await db.query(
    `SELECT * FROM blog_files WHERE ${where} ORDER BY created_at DESC;`,
    values
  )
  return res.rows as BlogFile[]
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
