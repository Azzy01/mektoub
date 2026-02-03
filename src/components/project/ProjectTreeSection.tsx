'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Note, ProjectNodeRow } from '../../lib/types'
import { createProjectGroup, createTaskInProject, deleteProjectNode, getProjectTree, renameProjectGroup } from '../../lib/repo'

type TreeItem =
  | { kind: 'group'; node: ProjectNodeRow; level: number }
  | { kind: 'task'; node: ProjectNodeRow; level: number; note: Note }

function buildTree(nodes: ProjectNodeRow[], notesById: Record<string, Note>) {
  const byParent = new Map<string, ProjectNodeRow[]>()
  for (const n of nodes) {
    const key = n.parent_id ?? '__root__'
    const arr = byParent.get(key) ?? []
    arr.push(n)
    byParent.set(key, arr)
  }

  // sort by sort_order then created_at
  for (const [k, arr] of byParent.entries()) {
    arr.sort((a, b) => (a.sort_order - b.sort_order) || a.created_at.localeCompare(b.created_at))
    byParent.set(k, arr)
  }

  const out: TreeItem[] = []

  function walk(parentKey: string, level: number) {
    const arr = byParent.get(parentKey) ?? []
    for (const node of arr) {
      if (node.kind === 'group') {
        out.push({ kind: 'group', node, level })
        walk(node.id, level + 1)
      } else {
        const noteId = node.note_id ?? ''
        const note = notesById[noteId]
        if (note) out.push({ kind: 'task', node, level, note })
        else out.push({ kind: 'task', node, level, note: { id: noteId, type: 'task', title: '(Missing task)', content: '', status: 'open', due_at: null, project_id: null, notebook_id: null, tags: [], pinned: 0, priority: 3, urgent: 0, created_at: '', updated_at: '' } as any })
      }
    }
  }

  walk('__root__', 0)
  return out
}

export default function ProjectTreeSection(props: { projectId: string }) {
  const [nodes, setNodes] = useState<ProjectNodeRow[]>([])
  const [taskNotesById, setTaskNotesById] = useState<Record<string, Note>>({})
  const [loading, setLoading] = useState(true)

  async function reload() {
    setLoading(true)
    const res = await getProjectTree(props.projectId)
    setNodes(res.nodes)
    setTaskNotesById(res.taskNotesById)
    setLoading(false)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.projectId])

  const items = useMemo(() => buildTree(nodes, taskNotesById), [nodes, taskNotesById])

  async function addRootGroup() {
    const title = prompt('Group name?')
    if (!title) return
    await createProjectGroup({ projectId: props.projectId, parentId: null, title })
    await reload()
  }

  async function addChildGroup(parentId: string) {
    const title = prompt('Group name?')
    if (!title) return
    await createProjectGroup({ projectId: props.projectId, parentId, title })
    await reload()
  }

  async function addTask(parentId: string | null) {
    const title = prompt('Task title?')
    if (!title) return
    const { noteId } = await createTaskInProject({ projectId: props.projectId, parentId, title })
    // open task immediately
    window.location.href = `/note/${noteId}`
  }

  if (loading) return <div className="mt-6 opacity-70">Loading project structure…</div>

  return (
    <div className="mt-6 border rounded p-4">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold">Project structure</h2>
        <button className="ml-auto border rounded px-2 py-1 text-sm" onClick={addRootGroup}>
          + Group
        </button>
        <button className="border rounded px-2 py-1 text-sm" onClick={() => addTask(null)}>
          + Task
        </button>
      </div>

      {items.length === 0 ? (
        <div className="mt-3 text-sm opacity-70">No groups/tasks yet. Create your first group or task.</div>
      ) : (
        <div className="mt-3 space-y-1">
          {items.map((it) => {
            const pad = 12 + it.level * 18
            if (it.kind === 'group') {
              return (
                <div key={it.node.id} className="flex items-center gap-2 border rounded px-2 py-2" style={{ paddingLeft: pad }}>
                  <div className="font-semibold truncate">📁 {it.node.title || '(Group)'}</div>

                  <div className="ml-auto flex gap-2">
                    <button
                      className="border rounded px-2 py-1 text-sm hover:bg-white/10"
                      onClick={async () => addChildGroup(it.node.id)}
                      title="Add subgroup"
                    >
                      + Group
                    </button>
                    <button
                      className="border rounded px-2 py-1 text-sm hover:bg-white/10"
                      onClick={async () => addTask(it.node.id)}
                      title="Add task"
                    >
                      + Task
                    </button>
                    <button
                      className="border rounded px-2 py-1 text-sm hover:bg-white/10"
                      onClick={async () => {
                        const name = prompt('Rename group:', it.node.title)
                        if (!name) return
                        await renameProjectGroup(it.node.id, name)
                        await reload()
                      }}
                      title="Rename"
                    >
                      ✏️
                    </button>
                    <button
                      className="border rounded px-2 py-1 text-sm hover:bg-white/10"
                      onClick={async () => {
                        if (!confirm(`Delete group "${it.node.title}" and its content structure?`)) return
                        await deleteProjectNode(it.node.id)
                        await reload()
                      }}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )
            }

            // task
            return (
              <button
                key={it.node.id}
                className="w-full text-left flex items-center gap-2 border rounded px-2 py-2 hover:bg-white/10"
                style={{ paddingLeft: pad }}
                onClick={() => (window.location.href = `/note/${it.note.id}`)}
                title="Open task"
              >
                <span className="truncate">
                  ✅ {it.note.title}
                  {it.note.status !== 'open' ? <span className="opacity-70"> ({it.note.status})</span> : null}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
