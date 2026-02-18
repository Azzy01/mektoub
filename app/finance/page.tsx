import { Suspense } from 'react'
import FinanceBook from '../../src/components/finance/FinanceBook'

export default function Page() {
  return (
    <Suspense fallback={<div className="panel p-4">Loading…</div>}>
      <FinanceBook />
    </Suspense>
  )
}
