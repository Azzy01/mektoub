import { Suspense } from 'react'
import DictionaryPage from '../../../src/components/finance/DictionaryPage'

export default function Page() {
  return (
    <Suspense fallback={<div className="panel p-4">Loading…</div>}>
      <DictionaryPage />
    </Suspense>
  )
}
