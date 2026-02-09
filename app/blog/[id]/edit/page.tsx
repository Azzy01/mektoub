'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import AppShell from '../../../../src/components/shell/AppShell'
import BlogSidebar from '../../../../src/components/blog/BlogSidebar'
import { getBlogPost, listBlogCategories, listBlogFiles, updateBlogPost } from '../../../../src/lib/repo'
import type { BlogCategory, BlogFile } from '../../../../src/lib/types'

const EXCERPT_MAX = 300

export default function Page() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [active, setActive] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [inlineFiles, setInlineFiles] = useState<File[]>([])
  const [existingInline, setExistingInline] = useState<BlogFile[]>([])

  const postId = useMemo(() => {
    const raw = params.id
    return Array.isArray(raw) ? raw[0] : raw
  }, [params.id])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const cats = await listBlogCategories()
      const post = await getBlogPost(postId)
      const files = await listBlogFiles(postId, 'inline')
      if (cancelled) return
      setCategories(cats)
      setExistingInline(files)
      if (!post) {
        setLoading(false)
        return
      }
      setTitle(post.title)
      setSlug(post.slug)
      setCategoryId(post.category_id)
      setExcerpt(post.excerpt)
      setContent(post.content)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [postId])

  async function onSave(status: 'draft' | 'published') {
    setError(null)
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    if (!categoryId) {
      setError('Category is required.')
      return
    }
    if (!excerpt.trim()) {
      setError('Short description is required.')
      return
    }

    setSaving(true)
    try {
      await updateBlogPost(postId, {
        title,
        slug: slug || undefined,
        category_id: categoryId,
        excerpt: excerpt.slice(0, EXCERPT_MAX),
        content,
        coverFile,
        inlineFiles,
        status,
      })
      setSavedAt(new Date().toISOString())
      router.push('/blog')
    } catch (e: any) {
      setError(e?.message || 'Failed to save post.')
    } finally {
      setSaving(false)
    }
  }

  function onSelectCategory(catId: string | null) {
    setActive(catId)
    if (!catId) {
      router.push('/blog')
      return
    }
    if (catId === '__drafts__') {
      router.push('/blog?cat=drafts')
      return
    }
    router.push(`/blog?cat=${encodeURIComponent(catId)}`)
  }

  return (
    <AppShell left={<BlogSidebar active={active} onSelect={onSelectCategory} />}>
      <div className="border rounded p-4">
        <div className="flex items-center gap-2 text-sm">
          <Link className="border rounded px-2 py-1 hover:bg-white/10" href={`/blog/${postId}`}>
            Back to Post
          </Link>
          <Link className="border rounded px-2 py-1 hover:bg-white/10" href="/blog">
            Back to Blog
          </Link>
        </div>

        {loading && <div className="mt-4 opacity-70">Loading...</div>}
        {!loading && title === '' && (
          <div className="mt-4 opacity-70">Post not found.</div>
        )}

        {!loading && title !== '' && (
          <div className="mt-4">
            <div className="font-semibold text-lg">Edit blog post</div>
            <div className="mt-2 text-xs opacity-70">
              To insert an image in content, use: <span className="font-mono">[[image:filename]]</span>
            </div>
            <div className="mt-3 grid gap-3">
              <label className="text-sm opacity-80">Name</label>
              <input
                className="w-full border rounded px-3 py-2 bg-transparent"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title"
              />

              <label className="text-sm opacity-80">Category</label>
              <select
                className="w-full border rounded px-3 py-2 bg-transparent"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="" disabled>
                  Select category
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <label className="text-sm opacity-80">Picture/photo for preview</label>
              <input
                className="w-full border rounded px-3 py-2 bg-transparent"
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
              />

              <label className="text-sm opacity-80">
                Short description (max {EXCERPT_MAX} chars)
              </label>
              <textarea
                className="w-full border rounded px-3 py-2 bg-transparent"
                value={excerpt}
                maxLength={EXCERPT_MAX}
                rows={3}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Short preview description"
              />
              <div className="text-xs opacity-60 text-right">
                {excerpt.length}/{EXCERPT_MAX}
              </div>

              <label className="text-sm opacity-80">Content</label>
              <textarea
                className="w-full border rounded px-3 py-2 bg-transparent"
                value={content}
                rows={12}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Full article text"
              />

              <label className="text-sm opacity-80">Inline images (optional)</label>
              <input
                className="w-full border rounded px-3 py-2 bg-transparent"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  setInlineFiles(files)
                  if (files.length > 0) {
                    setContent((prev) => {
                      const existing = prev.toLowerCase()
                      const tokens = files
                        .map((f) => `[[image:${f.name}]]`)
                        .filter((t) => !existing.includes(t.toLowerCase()))
                      if (tokens.length === 0) return prev
                      const prefix = prev.trim().length ? '\n\n' : ''
                      return `${prev}${prefix}${tokens.join('\n\n')}`
                    })
                  }
                }}
              />
              {inlineFiles.length > 0 && (
                <div className="text-xs opacity-70">{inlineFiles.length} inline image(s) selected</div>
              )}
              {existingInline.length > 0 && (
                <div className="text-xs opacity-70">
                  Existing inline images:
                  <div className="mt-1 flex flex-wrap gap-2">
                    {existingInline.map((f) => (
                      <button
                        key={f.id}
                        className="border rounded px-2 py-1 hover:bg-white/10 font-mono"
                        onClick={() =>
                          setContent((prev) =>
                            `${prev}${prev.trim().length ? '\n\n' : ''}[[image:${f.filename}]]`
                          )
                        }
                      >
                        [[image:{f.filename}]]
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="text-sm opacity-80">Slug (optional)</label>
              <input
                className="w-full border rounded px-3 py-2 bg-transparent"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auto-generated if empty"
              />
            </div>

            {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
            {savedAt && !error && (
              <div className="mt-3 text-sm text-green-400">Saved at {new Date(savedAt).toLocaleString()}</div>
            )}

            <div className="mt-4 flex items-center gap-2">
              <button
                className="border rounded px-3 py-2 hover:bg-white/10 disabled:opacity-60"
                onClick={() => onSave('published')}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                className="border rounded px-3 py-2 hover:bg-white/10 disabled:opacity-60"
                onClick={() => onSave('draft')}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save draft'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
