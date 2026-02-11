'use client'

import { useSearchParams } from 'next/navigation'
import NotePage from './NotePage'

export default function NotePageClient() {
  const search = useSearchParams()
  const id = search.get('id')
  const isNew = search.get('new') === '1'
  const resolved = id || (isNew ? 'new' : '')

  if (!resolved) {
    return <div className="panel p-4">Missing note id.</div>
  }

  return <NotePage id={resolved} />
}
