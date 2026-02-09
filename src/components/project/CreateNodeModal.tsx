'use client'

import { useEffect, useState } from 'react'

export type CreateKind = 'group' | 'task'

export default function CreateNodeModal(props: {
  open: boolean
  kind: CreateKind
  parentLabel: string
  initialTitle?: string
  onClose: () => void
  onCreate: (title: string) => Promise<void>
}) {
  const [title, setTitle] = useState(props.initialTitle ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (props.open) {
      setTitle(props.initialTitle ?? '')
      setSaving(false)
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open])

  if (!props.open) return null

  async function submit() {
    const t = title.trim()
    if (!t) {
      setError('Title is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await props.onCreate(t)
      props.onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/60" onClick={props.onClose} />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md border rounded bg-[#0b0b0b] p-4 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="font-semibold">
              Create {props.kind === 'group' ? 'Group' : 'Task'}
            </div>
            <button className="ml-auto border rounded px-2 py-1 text-sm hover:bg-white/10" onClick={props.onClose}>
              ✕
            </button>
          </div>

          <div className="mt-2 text-sm opacity-70">
            Inside: <span className="font-medium opacity-100">{props.parentLabel}</span>
          </div>

          <div className="mt-4">
            <label className="text-xs opacity-70">Title</label>
            <input
              autoFocus
              className="mt-1 w-full border rounded px-3 py-2"
              value={title}
              placeholder={props.kind === 'group' ? 'e.g., Repairs' : 'e.g., Fix faucet'}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
                if (e.key === 'Escape') props.onClose()
              }}
            />
          </div>

          {error ? (
            <div className="mt-3 text-sm border border-red-400/40 bg-red-500/10 text-red-200 rounded p-2">
              {error}
            </div>
          ) : null}

          <div className="mt-4 flex gap-2">
            <button className="border rounded px-3 py-2 hover:bg-white/10" onClick={props.onClose} disabled={saving}>
              Cancel
            </button>
            <button
              className="ml-auto border rounded px-3 py-2 disabled:opacity-50 hover:bg-white/10"
              onClick={submit}
              disabled={saving}
            >
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
