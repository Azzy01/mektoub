import TopNav from './TopNav'
import AutoSync from './AutoSync'

export default function AppShell({
  left,
  children,
}: {
  left: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen p-4 md:p-6">
      <AutoSync />
      <div className="mx-auto max-w-6xl w-full">
        <TopNav />
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-3 md:gap-4 min-w-0">
          <aside className="panel p-3 h-fit md:sticky md:top-6 min-w-0">{left}</aside>
          <main className="space-y-4 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
