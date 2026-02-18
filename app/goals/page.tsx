import { Suspense } from 'react'
import GoalsHome from '../../src/components/goals/GoalsHome'

export default function Page() {
  return (
    <Suspense fallback={<div className="panel p-4">Loading…</div>}>
      <GoalsHome />
    </Suspense>
  )
}
