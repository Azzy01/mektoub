import { Suspense } from 'react'
import ProjectsPageClient from '../../src/components/projects/ProjectsPageClient'

export default function Page() {
  return (
    <Suspense fallback={<div className="panel p-4">Loading…</div>}>
      <ProjectsPageClient />
    </Suspense>
  )
}
