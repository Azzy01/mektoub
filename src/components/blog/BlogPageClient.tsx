'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import AppShell from '../shell/AppShell'
import BlogSidebar from './BlogSidebar'
import { createBlogPost, deleteBlogPost, listBlogCategories, listBlogPosts } from '../../lib/repo'
import type { BlogCategory, BlogPost } from '../../lib/types'

const EXCERPT_MAX = 300

export default function BlogPageClient() {
  const [active, setActive] = useState<string | null>(null)
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'grid3' | 'grid4'>('list')
  const router = useRouter()
  const searchParams = useSearchParams()

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [inlineFiles, setInlineFiles] = useState<File[]>([])

  const activeCategoryName = useMemo(() => {
    if (!active) return 'All'
    if (active === '__drafts__') return 'Drafts'
    return categories.find((c) => c.id === active)?.name ?? 'All'
  }, [active, categories])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const cats = await listBlogCategories()
      if (cancelled) return
      setCategories(cats)
      setCategoryId((prev) => prev || cats[0]?.id || '')
    }
    load()
    const onUpdated = () => load()
    window.addEventListener('blog-categories-updated', onUpdated)
    return () => {
      cancelled = true
      window.removeEventListener('blog-categories-updated', onUpdated)
    }
  }, [])

  useEffect(() => {
    const cat = searchParams.get('cat')
    if (!cat || cat === 'all') {
      setActive(null)
    } else if (cat === 'drafts') {
      setActive('__drafts__')
    } else {
      setActive(cat)
    }
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const rows = await listBlogPosts({
        categoryId: active && active !== '__drafts__' ? active : undefined,
        status: active === '__drafts__' ? 'draft' : 'published',
      })
      if (!cancelled) setPosts(rows)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [active])

  async function refreshPosts() {
    const rows = await listBlogPosts({
      categoryId: active && active !== '__drafts__' ? active : undefined,
      status: active === '__drafts__' ? 'draft' : 'published',
    })
    setPosts(rows)
  }

  function resetForm() {
    setTitle('')
    setSlug('')
    setExcerpt('')
    setContent('')
    setCoverFile(null)
    setInlineFiles([])
  }

  async function onCreate(targetStatus: 'draft' | 'published') {
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

    setLoading(true)
    try {
      await createBlogPost({
        title,
        slug: slug || undefined,
        category_id: categoryId,
        excerpt: excerpt.slice(0, EXCERPT_MAX),
        content,
        coverFile,
        inlineFiles,
        status: targetStatus,
      })
      resetForm()
      setShowCreate(false)
      await refreshPosts()
    } catch (e: any) {
      setError(e?.message || 'Failed to save post.')
    } finally {
      setLoading(false)
    }
  }

  async function onDelete(post: BlogPost) {
    const ok = confirm(`Delete "${post.title}"? This cannot be undone.`)
    if (!ok) return
    await deleteBlogPost(post.id)
    await refreshPosts()
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
      <div className="space-y-4">
        <div className="panel p-4">
          <div className="flex items-center gap-3">
            <div className="font-semibold text-lg">Blog posts</div>
            <button
              className="ml-auto border rounded px-3 py-2 text-sm hover:bg-white/10"
              onClick={() => {
                resetForm()
                setShowCreate(true)
              }}
            >
              Create new post
            </button>
          </div>
          <div className="mt-2 text-sm opacity-70">
            Category selected: <span className="opacity-100 font-medium">{activeCategoryName}</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="opacity-70">View:</span>
            <button
              className={`border rounded px-2 py-1 ${viewMode === 'list' ? 'bg-white/15 border-white/30' : 'hover:bg-white/10'}`}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
            <button
              className={`border rounded px-2 py-1 ${viewMode === 'grid3' ? 'bg-white/15 border-white/30' : 'hover:bg-white/10'}`}
              onClick={() => setViewMode('grid3')}
            >
              Grid 3
            </button>
            <button
              className={`border rounded px-2 py-1 ${viewMode === 'grid4' ? 'bg-white/15 border-white/30' : 'hover:bg-white/10'}`}
              onClick={() => setViewMode('grid4')}
            >
              Grid 4
            </button>
          </div>

          <div
            className={
              viewMode === 'list'
                ? 'mt-4 grid gap-3'
                : `mt-4 grid gap-3 ${viewMode === 'grid3' ? 'md:grid-cols-3' : 'md:grid-cols-4'}`
            }
          >
            {posts.length === 0 && (
              <div className="text-sm opacity-60">No posts yet.</div>
            )}
            {posts.map((p) => {
              const coverSrc = p.cover_file
                ? `data:${p.cover_file.mime};base64,${p.cover_file.data_base64}`
                : null
              return (
                <div
                  key={p.id}
                  className={`group border rounded p-3 cursor-pointer ${viewMode === 'list' ? 'flex gap-3' : ''}`}
                  onClick={() => router.push(`/blog/post?id=${p.id}`)}
                  title="Open post"
                >
                  {coverSrc && (
                    <Image
                      src={coverSrc}
                      alt={p.title}
                      width={640}
                      height={360}
                      unoptimized
                      className={viewMode === 'list' ? 'h-20 w-28 rounded object-cover border' : 'h-36 w-full rounded object-cover border'}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs opacity-70">
                      {p.category_name} • {p.status} • {new Date(p.updated_at).toLocaleString()}
                    </div>
                    <div className="mt-2 text-sm opacity-80 max-h-10 overflow-hidden">
                      {p.excerpt}
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        className="border rounded px-2 py-1 hover:bg-white/10"
                        href={`/blog/post?id=${p.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open
                      </Link>
                      <Link
                        className="border rounded px-2 py-1 hover:bg-white/10"
                        href={`/blog/post?id=${p.id}&edit=1`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Edit
                      </Link>
                      <button
                        className="border rounded px-2 py-1 hover:bg-white/10"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(p)
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {showCreate && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => {
              resetForm()
              setShowCreate(false)
            }}
            >
              <div
                className="w-full max-w-3xl max-h-[90vh] overflow-auto border rounded bg-[var(--background)] text-[var(--foreground)] p-4"
                onClick={(e) => e.stopPropagation()}
              >
              <div className="flex items-center gap-2">
                <div className="font-semibold text-lg">Create blog post</div>
                <button
                  className="ml-auto border rounded px-2 py-1 text-sm hover:bg-white/10"
                  onClick={() => {
                    resetForm()
                    setShowCreate(false)
                  }}
                >
                  Close
                </button>
              </div>
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

                <label className="text-sm opacity-80">Slug (optional)</label>
                <input
                  className="w-full border rounded px-3 py-2 bg-transparent"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="auto-generated if empty"
                />
              </div>

              {error && <div className="mt-3 text-sm text-red-400">{error}</div>}

              <div className="mt-4 flex items-center gap-2">
                <button
                  className="border rounded px-3 py-2 hover:bg-white/10 disabled:opacity-60"
                  onClick={() => onCreate('published')}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  className="border rounded px-3 py-2 hover:bg-white/10 disabled:opacity-60"
                  onClick={() => onCreate('draft')}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save draft'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
