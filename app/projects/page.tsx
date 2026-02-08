import AppShell from '../../src/components/shell/AppShell'
import ProjectsSidebar from '../../src/components/projects/ProjectsSidebar'
import ProjectsHome from '../../src/components/projects/ProjectsHome'

export default function Page() {
  return (
    <AppShell left={<ProjectsSidebar />}>
      <ProjectsHome />
    </AppShell>
  )
}
