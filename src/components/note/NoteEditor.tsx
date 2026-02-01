'use client'

import TagsEditor from './TagsEditor'
import { toLocalInput } from './utils'
import type { Note, NoteStatus } from '../../lib/types'

type NotePatch = Partial<
  Pick<Note, 'title' | 'content' | 'status' | 'due_at' | 'project_id' | 'tags' | 'priority' | 'urgent'>
>

export default function NoteEditor(props: {
  note: Note
  effective: {
    title: string
    content: string
    status: NoteStatus
    due_at: string | null
    tags: string[]
  }
  saving: boolean
  dirty: boolean
  setDraft: (updater: (d: NotePatch) => NotePatch) => void
  markDirty: () => void
  onSave: () => Promise<void>
  onCancel: () => void
  onDelete: () => Promise<void>
}) {
  const n = props.note
  const e = props.effective

  return (
    <div className="mt-4 border rounded p-4">
      <label className="text-xs opacity-70">Title</label>
      <input
        className="w-full border rounded px-3 py-2 mt-1"
        placeholder="Title"
        value={e.title}
        onFocus={(ev) => ev.currentTarget.select()}
        onChange={(ev) => {
          props.setDraft((d) => ({ ...d, title: ev.target.value }))
          props.markDirty()
        }}
      />

      <div className="mt-4 flex flex-wrap gap-3 items-center">
        <label className="text-xs opacity-70">Status</label>
        <select
          className="border rounded px-3 py-2"
          value={e.status}
          onChange={(ev) => {
            props.setDraft((d) => ({ ...d, status: ev.target.value as NoteStatus }))
            props.markDirty()
          }}
        >
          <option value="open">open</option>
          <option value="done">done</option>
          <option value="archived">archived</option>
        </select>

        {n.type === 'task' && (
          <>
            <label className="text-xs opacity-70">Due</label>
            <input
              className="border rounded px-3 py-2"
              type="datetime-local"
              value={e.due_at ? toLocalInput(e.due_at) : ''}
              onChange={(ev) => {
                const iso = ev.target.value ? new Date(ev.target.value).toISOString() : null
                props.setDraft((d) => ({ ...d, due_at: iso }))
                props.markDirty()
              }}
            />
          </>
        )}

        <div className="ml-auto flex gap-2">
          <button
            className="border rounded px-3 py-2 disabled:opacity-50"
            disabled={!props.dirty || props.saving}
            onClick={props.onSave}
          >
            Save
          </button>
          <button
            className="border rounded px-3 py-2 disabled:opacity-50"
            disabled={!props.dirty || props.saving}
            onClick={props.onCancel}
          >
            Cancel
          </button>
          <button className="border rounded px-3 py-2" onClick={props.onDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="mt-4">
        <label className="text-xs opacity-70">Tags</label>
        <TagsEditor
          tags={e.tags}
          onChange={(next) => {
            props.setDraft((d) => ({ ...d, tags: next }))
            props.markDirty()
          }}
        />
      </div>

      <div className="mt-4">
        <label className="text-xs opacity-70">Content</label>
        <textarea
          className="w-full border rounded px-3 py-2 mt-1 min-h-[180px]"
          placeholder="Write here..."
          value={e.content}
          onChange={(ev) => {
            props.setDraft((d) => ({ ...d, content: ev.target.value }))
            props.markDirty()
          }}
        />
      </div>
    </div>
  )
}
