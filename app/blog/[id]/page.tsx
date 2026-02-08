'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import AppShell from '../../../src/components/shell/AppShell'
import BlogSidebar from '../../../src/components/blog/BlogSidebar'
import { getBlogPost, listBlogFiles } from '../../../src/lib/repo'
import type { BlogFile, BlogPost } from '../../../src/lib/types'

export default function Page() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [active, setActive] = useState<string | null>(null)
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [inlineFiles, setInlineFiles] = useState<BlogFile[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const res = await getBlogPost(params.id)
      const files = await listBlogFiles(params.id, 'inline')
      if (cancelled) return
      setPost(res)
      setInlineFiles(files)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [params.id])

  const coverSrc = useMemo(() => {
    if (!post?.cover_file) return null
    return `data:${post.cover_file.mime};base64,${post.cover_file.data_base64}`
  }, [post])

  const contentBlocks = useMemo(() => {
    const raw = post?.content || ''
    const byName = new Map(
      inlineFiles.map((f) => [f.filename.toLowerCase(), f])
    )
    const blocks: Array<
      | { type: 'text'; value: string }
      | { type: 'image'; file: BlogFile | null; name: string }
    > = []

    const regex = /\[\[image:([^\]]+)\]\]/gi
    let lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = regex.exec(raw)) !== null) {
      const before = raw.slice(lastIndex, match.index)
      if (before.trim()) blocks.push({ type: 'text', value: before })
      const name = match[1].trim()
      const file = byName.get(name.toLowerCase()) || null
      blocks.push({ type: 'image', file, name })
      lastIndex = match.index + match[0].length
    }
    const tail = raw.slice(lastIndex)
    if (tail.trim()) blocks.push({ type: 'text', value: tail })
    return blocks
  }, [post, inlineFiles])

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
          <Link className="border rounded px-2 py-1 hover:bg-white/10" href="/blog">
            Back to Blog
          </Link>
          {post && (
            <Link className="border rounded px-2 py-1 hover:bg-white/10" href={`/blog/${post.id}/edit`}>
              Edit
            </Link>
          )}
        </div>

        {loading && <div className="mt-4 opacity-70">Loading...</div>}
        {!loading && !post && <div className="mt-4 opacity-70">Post not found.</div>}

        {post && (
          <article className="mt-4 space-y-4">
            <div className="text-xs uppercase tracking-wide opacity-60">{post.category_name}</div>
            <h1 className="text-2xl font-semibold">{post.title}</h1>
            <div className="text-xs opacity-60">
              {post.status === 'published' && post.published_at
                ? `Published ${new Date(post.published_at).toLocaleString()}`
                : `Updated ${new Date(post.updated_at).toLocaleString()}`}
            </div>
            {coverSrc && (
              <img src={coverSrc} alt={post.title} className="w-full max-h-96 object-cover rounded border" />
            )}
            {post.excerpt && <p className="text-base opacity-90">{post.excerpt}</p>}
            <div className="space-y-3 text-base leading-relaxed">
              {contentBlocks.length === 0 && <div className="opacity-60">No content.</div>}
              {contentBlocks.map((block, i) => {
                if (block.type === 'image') {
                  if (!block.file) {
                    return (
                      <div key={`img-${i}`} className="text-sm opacity-60">
                        Missing image: {block.name}
                      </div>
                    )
                  }
                  const src = `data:${block.file.mime};base64,${block.file.data_base64}`
                  return (
                    <img
                      key={`img-${block.file.id}-${i}`}
                      src={src}
                      alt={block.file.filename}
                      className="w-full max-h-96 object-cover rounded border"
                    />
                  )
                }
                const paragraphs = block.value
                  .split(/\n{2,}/g)
                  .map((p) => p.trim())
                  .filter(Boolean)
                return paragraphs.map((p, j) => <p key={`p-${i}-${j}`}>{p}</p>)
              })}
            </div>
          </article>
        )}
      </div>
    </AppShell>
  )
}
