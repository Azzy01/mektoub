import { Suspense } from 'react'
import BlogPostClient from '../../../src/components/blog/BlogPostClient'

export default function Page() {
  return (
    <Suspense fallback={<div className="panel p-4">Loading…</div>}>
      <BlogPostClient />
    </Suspense>
  )
}
