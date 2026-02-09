'use client'

import type { FileRow } from '../../lib/types'
import { attachFile, deleteFile } from '../../lib/repo'
import { formatBytes } from './utils'

export default function NoteFilesSection(props: {
  noteId: string
  files: FileRow[]
  reload: () => Promise<void>
}) {
  return (
    <div className="mt-6 border rounded p-4">
      <h2 className="font-semibold">Files</h2>

      <input
        className="mt-3"
        type="file"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (!f) return
          await attachFile(props.noteId, f)
          e.target.value = ''
          await props.reload()
        }}
      />

      <ul className="mt-4 space-y-2">
        {props.files.map((f) => (
          <li key={f.id} className="border rounded p-3 flex items-center gap-3">
            <div className="min-w-0">
              <div className="font-semibold truncate">{f.filename}</div>
              <div className="text-xs opacity-70">
                {f.mime} • {formatBytes(f.size)}
              </div>
            </div>

            <a className="ml-auto underline text-sm" download={f.filename} href={`data:${f.mime};base64,${f.data_base64}`}>
              download
            </a>

            <button
              className="underline text-sm"
              onClick={async () => {
                await deleteFile(f.id)
                await props.reload()
              }}
            >
              remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
