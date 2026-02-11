import { Suspense } from 'react'
import NotePageClient from '../../src/components/note/NotePageClient'

export default function Page() {
  return (
    <Suspense fallback={<div className="panel p-4">Loading…</div>}>
      <NotePageClient />
    </Suspense>
  )
}
