import AppShell from '../../src/components/shell/AppShell'
import ProjectsSidebar from '../../src/components/projects/ProjectsSidebar'

export default function Page() {
  return (
    <AppShell left={<ProjectsSidebar />}>
      <div className="border rounded p-4">
        <div className="font-semibold">Projects</div>
        <div className="mt-2 opacity-70">Select a project from the left sidebar.</div>
      </div>
    </AppShell>
  )
}
