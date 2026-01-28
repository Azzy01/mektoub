'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { FileRow, ListItem, Note, NoteStatus, NoteType } from '../../lib/types'
import {
  addItem,
  attachFile,
  deleteFile,
  deleteItem,
  deleteNote,
  getNote,
  listFiles,
  listItems,
  toggleItem,
  updateNote,
} from '../../lib/repo'
import TagsEditor from './TagsEditor'
import AddItem from './AddItem'
import { formatBytes, normTags, toLocalInput } from './utils'

const TYPE_LABEL: Record<NoteType, string> = {
  idea: 'Idea',
  project: 'Project',
  task: 'Task',
  list: 'List',
  file: 'File note',
}

type NotePatch = Partial<
  Pick<
    Note,
    'title' | 'content' | 'status' | 'due_at' | 'project_id' | 'tags' | 'priority' | 'urgent'
  >
>

export default function NotePage({ id }: { id: string }) {
  const [note, setNote] = useState<Note | null>(null)
  const [draft, setDraft] = useState<NotePatch>({})
  const [items, setItems] = useState<ListItem[]>([])
  const [files, setFiles] = useState<FileRow[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  const effective = useMemo(() => {
    if (!note) {
      return {
        title: (draft.title ?? '') as string,
        content: (draft.content ?? '') as string,
        status: (draft.status ?? 'open') as NoteStatus,
        due_at: (draft.due_at ?? null) as string | null,
        tags: normTags(draft.tags),
        priority: Number(draft.priority ?? 3),
        urgent: ((draft.urgent ?? 0) as 0 | 1) ?? 0,
      }
    }

    return {
      title: (draft.title ?? note.title) as string,
      content: (draft.content ?? note.content) as string,
      status: (draft.status ?? note.status) as NoteStatus,
      due_at: (draft.due_at ?? note.due_at) as string | null,
      tags: normTags(draft.tags ?? note.tags),
      priority: Number(draft.priority ?? note.priority ?? 3),
      urgent: ((draft.urgent ?? note.urgent ?? 0) as 0 | 1) ?? 0,
    }
  }, [draft, note])

  async function load() {
    const n = await getNote(id)
    setNote(n)

    setDraft(
      n
        ? {
            title: n.title,
            content: n.content,
            status: n.status,
            due_at: n.due_at,
            project_id: n.project_id,
            tags: n.tags ?? [],
            priority: n.priority ?? 3,
            urgent: (n.urgent ?? 0) as 0 | 1,
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
        priority: Number(effective.priority ?? 3),
        urgent: (effective.urgent ?? 0) as 0 | 1,
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
    setDraft({
      title: n.title,
      content: n.content,
      status: n.status,
      due_at: n.due_at,
      project_id: n.project_id,
      tags: n.tags ?? [],
      priority: n.priority ?? 3,
      urgent: (n.urgent ?? 0) as 0 | 1,
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
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="underline"
            onClick={(e) => {
              if (dirty && !confirm('You have unsaved changes. Leave without saving?')) {
                e.preventDefault()
              }
            }}
          >
            ← Back
          </Link>

          <span className="text-xs px-2 py-1 rounded bg-gray-100">{TYPE_LABEL[n.type]}</span>

          <span className="ml-auto text-xs opacity-70">
            {dirty ? 'Unsaved changes' : saving ? 'Saving…' : 'Saved'}
          </span>
        </div>

        {error ? (
          <div className="mt-4 border border-red-300 bg-red-50 text-red-800 rounded p-3 text-sm">
            {error}
          </div>
        ) : null}

        <div className="mt-4 border rounded p-4">
          <label className="text-xs opacity-70">Title</label>
          <input
            className="w-full border rounded px-3 py-2 mt-1"
            placeholder="Title"
            value={effective.title}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              setDraft((d) => ({ ...d, title: e.target.value }))
              setDirty(true)
            }}
          />

          <div className="mt-4 flex flex-wrap gap-3 items-center">
            <label className="text-xs opacity-70">Status</label>
            <select
              className="border rounded px-3 py-2"
              value={effective.status}
              onChange={(e) => {
                setDraft((d) => ({ ...d, status: e.target.value as NoteStatus }))
                setDirty(true)
              }}
            >
              <option value="open">open</option>
              <option value="done">done</option>
              <option value="archived">archived</option>
            </select>

            <label className="text-xs opacity-70">Priority</label>
            <select
              className="border rounded px-3 py-2"
              value={String(effective.priority ?? 3)}
              onChange={(e) => {
                setDraft((d) => ({ ...d, priority: Number(e.target.value) }))
                setDirty(true)
              }}
            >
              <option value="1">1 (highest)</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5 (lowest)</option>
            </select>

            <label className="flex items-center gap-2 text-sm opacity-80">
              <input
                type="checkbox"
                checked={(effective.urgent ?? 0) === 1}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, urgent: e.target.checked ? 1 : 0 }))
                  setDirty(true)
                }}
              />
              Urgent
            </label>

            {n.type === 'task' && (
              <>
                <label className="text-xs opacity-70">Due</label>
                <input
                  className="border rounded px-3 py-2"
                  type="datetime-local"
                  value={effective.due_at ? toLocalInput(effective.due_at) : ''}
                  onChange={(e) => {
                    const iso = e.target.value ? new Date(e.target.value).toISOString() : null
                    setDraft((d) => ({ ...d, due_at: iso }))
                    setDirty(true)
                  }}
                />
              </>
            )}

            <div className="ml-auto flex gap-2">
              <button
                className="border rounded px-3 py-2 disabled:opacity-50"
                disabled={!dirty || saving}
                onClick={saveDraft}
              >
                Save
              </button>
              <button
                className="border rounded px-3 py-2 disabled:opacity-50"
                disabled={!dirty || saving}
                onClick={cancelDraft}
              >
                Cancel
              </button>
              <button className="border rounded px-3 py-2" onClick={onDelete}>
                Delete
              </button>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs opacity-70">Tags</label>
            <TagsEditor
              tags={effective.tags}
              onChange={(next) => {
                setDraft((d) => ({ ...d, tags: next }))
                setDirty(true)
              }}
            />
          </div>

          <div className="mt-4">
            <label className="text-xs opacity-70">Content</label>
            <textarea
              className="w-full border rounded px-3 py-2 mt-1 min-h-[180px]"
              placeholder="Write here..."
              value={effective.content}
              onChange={(e) => {
                setDraft((d) => ({ ...d, content: e.target.value }))
                setDirty(true)
              }}
            />
          </div>
        </div>

        {n.type === 'list' && (
          <div className="mt-6 border rounded p-4">
            <h2 className="font-semibold">List items</h2>

            <AddItem
              onAdd={async (text) => {
                await addItem(n.id, text)
                await load()
              }}
            />

            <ul className="mt-3 space-y-2">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 border rounded p-2">
                  <input
                    type="checkbox"
                    checked={it.done === 1}
                    onChange={async (e) => {
                      await toggleItem(it.id, e.target.checked ? 1 : 0)
                      await load()
                    }}
                  />
                  <span className={it.done === 1 ? 'line-through opacity-60' : ''}>{it.text}</span>
                  <button
                    className="ml-auto text-sm underline"
                    onClick={async () => {
                      await deleteItem(it.id)
                      await load()
                    }}
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {n.type === 'file' && (
          <div className="mt-6 border rounded p-4">
            <h2 className="font-semibold">Files</h2>

            <input
              className="mt-3"
              type="file"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                await attachFile(n.id, f)
                e.target.value = ''
                await load()
              }}
            />

            <ul className="mt-4 space-y-2">
              {files.map((f) => (
                <li key={f.id} className="border rounded p-3 flex items-center gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{f.filename}</div>
                    <div className="text-xs opacity-70">
                      {f.mime} • {formatBytes(f.size)}
                    </div>
                  </div>

                  <a
                    className="ml-auto underline text-sm"
                    download={f.filename}
                    href={`data:${f.mime};base64,${f.data_base64}`}
                  >
                    download
                  </a>

                  <button
                    className="underline text-sm"
                    onClick={async () => {
                      await deleteFile(f.id)
                      await load()
                    }}
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
