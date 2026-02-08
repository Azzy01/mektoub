'use client'

import { useState } from 'react'
import AppShell from '../../src/components/shell/AppShell'
import BlogSidebar from '../../src/components/blog/BlogSidebar'

export default function Page() {
  const [active, setActive] = useState<string | null>(null)

  return (
    <AppShell left={<BlogSidebar active={active} onSelect={setActive} />}>
      <div className="border rounded p-4">
        <div className="font-semibold">Blog</div>
        <div className="mt-2 opacity-70">
          Placeholder for blog posts. Category selected:{' '}
          <span className="opacity-100 font-medium">{active ?? 'All'}</span>
        </div>

        <div className="mt-4 border rounded p-3 opacity-70">
          Next phase: create post, editor, attachments, search, publish/export.
        </div>
      </div>
    </AppShell>
  )
}
