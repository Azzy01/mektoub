'use client'

import { useEffect, useMemo, useState } from 'react'
import { normTags } from './utils'
import type { FileRow, ListItem, Note, NoteStatus } from '../../lib/types'
import { deleteNote, getNote, listFiles, listItems, updateNote } from '../../lib/repo'
import NoteHeader from './NoteHeader'
import NoteEditor from './NoteEditor'
import NoteListSection from './NoteListSection'
import NoteFilesSection from './NoteFilesSection'
import ProjectTreeSection from '../project/ProjectTreeSection'

type NotePatch = Partial<
  Pick<Note, 'title' | 'content' | 'status' | 'due_at' | 'project_id' | 'tags' | 'priority' | 'urgent'>
>

export default function NotePage({ id }: { id: string }) {
  const [note, setNote] = useState<Note | null>(null)
  const [draft, setDraftState] = useState<NotePatch>({})
  const [items, setItems] = useState<ListItem[]>([])
  const [files, setFiles] = useState<FileRow[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  const setDraft = (updater: (d: NotePatch) => NotePatch) => {
    setDraftState((prev) => updater(prev))
  }

  const effective = useMemo(() => {
    if (!note) {
      return {
        title: (draft.title ?? '') as string,
        content: (draft.content ?? '') as string,
        status: (draft.status ?? 'open') as NoteStatus,
        due_at: (draft.due_at ?? null) as string | null,
        tags: normTags(draft.tags),
      }
    }

    return {
      title: (draft.title ?? note.title) as string,
      content: (draft.content ?? note.content) as string,
      status: (draft.status ?? note.status) as NoteStatus,
      due_at: (draft.due_at ?? note.due_at) as string | null,
      tags: normTags(draft.tags ?? note.tags),
    }
  }, [draft, note])

  async function load() {
    const n = await getNote(id)
    setNote(n)

    setDraftState(
      n
        ? {
            title: n.title,
            content: n.content,
            status: n.status,
            due_at: n.due_at,
            project_id: n.project_id,
            tags: n.tags ?? [],
          }
        : {}
    )

    setDirty(false)
    setError(null)

    setItems([])
    setFiles([])
    if (n?.type === 'list') setItems(await listItems(id))
    if (n?.type === 'file') setFiles(await listFiles(id))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!note) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-3xl">
          <p className="opacity-70">Loading...</p>
        </div>
      </div>
    )
  }

  const n = note

  async function saveDraft() {
    setSaving(true)
    setError(null)
    try {
      const patch: NotePatch = {
        title: effective.title,
        content: effective.content,
        status: effective.status,
        due_at: effective.due_at ?? null,
        tags: normTags(effective.tags),
      }
      await updateNote(n.id, patch)
      setDirty(false)
      window.location.href = '/'
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function cancelDraft() {
    setDraftState({
      title: n.title,
      content: n.content,
      status: n.status,
      due_at: n.due_at,
      project_id: n.project_id,
      tags: n.tags ?? [],
    })
    setDirty(false)
    setError(null)
  }

  async function onDelete() {
    if (!confirm('Delete this note?')) return
    await deleteNote(n.id)
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl">
        <NoteHeader noteType={n.type} dirty={dirty} saving={saving} />

        {error ? (
          <div className="mt-4 border border-red-300 bg-red-50 text-red-800 rounded p-3 text-sm">
            {error}
          </div>
        ) : null}

        <NoteEditor
          note={n}
          effective={effective}
          saving={saving}
          dirty={dirty}
          setDraft={setDraft}
          markDirty={() => setDirty(true)}
          onSave={saveDraft}
          onCancel={cancelDraft}
          onDelete={onDelete}
        />

        {/* ✅ Project-only section */}
        {n.type === 'project' && <ProjectTreeSection projectId={n.id} />}

        {n.type === 'list' && <NoteListSection noteId={n.id} items={items} reload={load} />}
        {n.type === 'file' && <NoteFilesSection noteId={n.id} files={files} reload={load} />}
      </div>
    </div>
  )
}
