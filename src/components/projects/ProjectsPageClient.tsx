'use client'

import AppShell from '../shell/AppShell'
import ProjectsSidebar from './ProjectsSidebar'
import ProjectsHome from './ProjectsHome'

export default function ProjectsPageClient() {
  return (
    <AppShell left={<ProjectsSidebar />}>
      <ProjectsHome />
    </AppShell>
  )
}
