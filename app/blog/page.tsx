import { Suspense } from 'react'
import BlogPageClient from '../../src/components/blog/BlogPageClient'

export default function Page() {
  return (
    <Suspense fallback={<div className="panel p-4">Loading…</div>}>
      <BlogPageClient />
    </Suspense>
  )
}
