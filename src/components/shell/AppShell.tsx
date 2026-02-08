import TopNav from './TopNav'

export default function AppShell({
  left,
  children,
}: {
  left: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <TopNav />
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
          <aside className="border rounded p-3 h-fit md:sticky md:top-6">{left}</aside>
          <main className="space-y-4">{children}</main>
        </div>
      </div>
    </div>
  )
}
