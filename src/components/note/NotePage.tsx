'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { normTags } from './utils'
import type { FileRow, ListItem, Note, NoteStatus } from '../../lib/types'
import { createNote, deleteNote, getNote, listFiles, listItems, updateNote } from '../../lib/repo'
import NoteHeader from './NoteHeader'
import NoteEditor from './NoteEditor'
import NoteListSection from './NoteListSection'
import NoteFilesSection from './NoteFilesSection'
import ProjectTreeSection from '../project/ProjectTreeSection'
import type { NoteType } from '../../lib/types'

type NotePatch = Partial<
  Pick<Note, 'title' | 'content' | 'status' | 'due_at' | 'project_id' | 'tags' | 'priority' | 'urgent'>
>

export default function NotePage({ id }: { id: string }) {
  const router = useRouter()
  const search = useSearchParams()
  const isNew = id === 'new'
  const newType = (search.get('type') as NoteType) || 'idea'
  const quick = search.get('quick') === '1'
  const notebookId = search.get('nb')
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
    if (isNew) {
      const dummy: Note = {
        id: 'new',
        type: newType,
        title: quick ? 'Quick note' : '',
        content: '',
        status: 'open',
        due_at: null,
        project_id: null,
        tags: quick ? ['quick'] : [],
        pinned: 0,
        priority: 3,
        urgent: 0,
        notebook_id: null,
        created_at: '',
        updated_at: '',
      }
      setNote(dummy)
      setDraftState({
        title: dummy.title,
        content: dummy.content,
        status: dummy.status,
        due_at: dummy.due_at,
        project_id: dummy.project_id,
        tags: dummy.tags ?? [],
      })
      setDirty(true)
      setError(null)
      setItems([])
      setFiles([])
      return
    }

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
      if (isNew) {
        const newId = await createNote({
          type: n.type,
          title: patch.title || 'Title',
          content: patch.content || '',
          tags: patch.tags ?? [],
          due_at: patch.due_at ?? null,
          notebook_id: notebookId || null,
        })
        setDirty(false)
        if (n.type === 'project') {
          router.push('/projects')
        } else {
          router.push(`/note/${newId}`)
        }
        return
      }
      await updateNote(n.id, patch)
      setDirty(false)
      router.push(n.type === 'project' ? '/projects' : '/')

    } catch (e: any) {
      setError(e?.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function cancelDraft() {
    if (isNew) {
      if (!confirm('Discard this new note?')) return
      router.push('/')
      return
    }
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
    if (isNew) {
      if (!confirm('Discard this new note?')) return
      router.push('/')
      return
    }
    if (!confirm('Delete this note?')) return
    await deleteNote(n.id)
    router.push(n.type === 'project' ? '/projects' : '/')

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
        {!isNew && n.type === 'project' && <ProjectTreeSection projectId={n.id} />}

        {!isNew && n.type === 'list' && <NoteListSection noteId={n.id} items={items} reload={load} />}
        {!isNew && n.type === 'file' && <NoteFilesSection noteId={n.id} files={files} reload={load} />}
      </div>
    </div>
  )
}
