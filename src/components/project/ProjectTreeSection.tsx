'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Note, ProjectNodeRow } from '../../lib/types'
import {
  createProjectGroup,
  createTaskInProject,
  deleteProjectNode,
  getProjectTree,
  renameProjectGroup,
  moveProjectNode,
} from '../../lib/repo'
import CreateNodeModal, { CreateKind } from './CreateNodeModal'
import TaskModal from './TaskModal'
import { deleteTaskNodeAndNote } from '../../lib/repo'
import { syncNow } from '../../lib/sync'


type TreeItem =
  | { kind: 'group'; node: ProjectNodeRow; level: number; hasChildren: boolean }
  | { kind: 'task'; node: ProjectNodeRow; level: number; note: Note }

function buildTree(
  nodes: ProjectNodeRow[],
  notesById: Record<string, Note>,
  expanded: Set<string>
) {
  const byParent = new Map<string, ProjectNodeRow[]>()
  for (const n of nodes) {
    const key = n.parent_id ?? '__root__'
    const arr = byParent.get(key) ?? []
    arr.push(n)
    byParent.set(key, arr)
  }

  for (const [k, arr] of byParent.entries()) {
    arr.sort((a, b) => (a.sort_order - b.sort_order) || a.created_at.localeCompare(b.created_at))
    byParent.set(k, arr)
  }

  const out: TreeItem[] = []

  function walk(parentKey: string, level: number) {
    const arr = byParent.get(parentKey) ?? []
    for (const node of arr) {
      if (node.kind === 'group') {
        const children = byParent.get(node.id) ?? []
        const hasChildren = children.length > 0
        out.push({ kind: 'group', node, level, hasChildren })

        // Only walk children if expanded
        if (expanded.has(node.id)) {
          walk(node.id, level + 1)
        }
      } else {
        const noteId = node.note_id ?? ''
        const note = notesById[noteId]
        if (note) {
          out.push({ kind: 'task', node, level, note })
        }
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

  // expanded groups in UI (Set of node ids)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalKind, setModalKind] = useState<CreateKind>('group')
  const [modalParentId, setModalParentId] = useState<string | null>(null)
  const [modalParentLabel, setModalParentLabel] = useState<string>('Project root')

  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [taskModalNoteId, setTaskModalNoteId] = useState<string | null>(null)
  const [taskModalNodeId, setTaskModalNodeId] = useState<string | null>(null)

  function syncInBackground() {
    void syncNow().catch(() => {
      // Ignore sync errors in local-first UI interactions.
    })
  }

  async function reload() {
    setLoading(true)
    const res = await getProjectTree(props.projectId)
    setNodes(res.nodes)
    setTaskNotesById(res.taskNotesById)

    // default expand all groups on first load
    setExpanded((prev) => {
      if (prev.size > 0) return prev
      const s = new Set<string>()
      for (const n of res.nodes) if (n.kind === 'group') s.add(n.id)
      return s
    })

    setLoading(false)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.projectId])

  const items = useMemo(() => buildTree(nodes, taskNotesById, expanded), [nodes, taskNotesById, expanded])

  function openCreate(kind: CreateKind, parentId: string | null, parentLabel: string) {
    setModalKind(kind)
    setModalParentId(parentId)
    setModalParentLabel(parentLabel)
    setModalOpen(true)
  }

  async function handleCreate(title: string) {
    if (modalKind === 'group') {
      const id = await createProjectGroup({ projectId: props.projectId, parentId: modalParentId, title })
      // auto-expand the new group parent chain
      if (modalParentId) {
        setExpanded((prev) => new Set(prev).add(modalParentId))
      }
      // expand new group itself
      setExpanded((prev) => new Set(prev).add(id))
      await reload()
      syncInBackground()
      return
    }

    // task
    const { noteId, nodeId } = await createTaskInProject({
      projectId: props.projectId,
      parentId: modalParentId,
      title,
    })
    await reload()
    syncInBackground()
    setTaskModalNoteId(noteId)
    setTaskModalNodeId(nodeId)
    setTaskModalOpen(true)
  }

  function toggleExpand(groupId: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  function expandAll() {
    const s = new Set<string>()
    for (const n of nodes) if (n.kind === 'group') s.add(n.id)
    setExpanded(s)
  }

  function collapseAll() {
    setExpanded(new Set())
  }

  if (loading) return <div className="mt-6 opacity-70">Loading project structure…</div>

  return (
    <div className="mt-6 border rounded p-4">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold">Project structure</h2>

        <button className="ml-auto border rounded px-2 py-1 text-sm hover:bg-white/10" onClick={expandAll}>
          Expand all
        </button>
        <button className="border rounded px-2 py-1 text-sm hover:bg-white/10" onClick={collapseAll}>
          Collapse all
        </button>

        <button
          className="border rounded px-2 py-1 text-sm hover:bg-white/10"
          onClick={() => openCreate('group', null, 'Project root')}
        >
          + Group
        </button>
        <button
          className="border rounded px-2 py-1 text-sm hover:bg-white/10"
          onClick={() => openCreate('task', null, 'Project root')}
        >
          + Task
        </button>
      </div>

      {items.length === 0 ? (
        <div className="mt-3 text-sm opacity-70">No groups/tasks yet. Create your first group or task.</div>
      ) : (
        <div className="mt-3 space-y-1">
          <div
            className="text-xs opacity-70 border border-dashed rounded px-2 py-2"
            onDragOver={(e) => e.preventDefault()}
                    onDrop={async (e) => {
                      e.preventDefault()
                      const nodeId = e.dataTransfer.getData('nodeId')
                      const kind = e.dataTransfer.getData('kind')
                      if (!nodeId || kind !== 'task') return
                      await moveProjectNode({ nodeId, newParentId: null })
                      await reload()
                      syncInBackground()
                    }}
                  >
            Drop here to move task to Project root
          </div>
          {items.map((it) => {
            const pad = 10 + it.level * 18

            if (it.kind === 'group') {
              const isOpen = expanded.has(it.node.id)

              return (
                <div
                  key={it.node.id}
                  className="flex items-center gap-2 border rounded px-2 py-2"
                  style={{ paddingLeft: pad }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault()
                    const nodeId = e.dataTransfer.getData('nodeId')
                    const kind = e.dataTransfer.getData('kind')
                    if (!nodeId || kind !== 'task') return
                    await moveProjectNode({ nodeId, newParentId: it.node.id })
                    await reload()
                    syncInBackground()
                  }}
                >
                  <button
                    className="w-7 h-7 border rounded hover:bg-white/10 flex items-center justify-center"
                    onClick={() => toggleExpand(it.node.id)}
                    title={isOpen ? 'Collapse' : 'Expand'}
                  >
                    {it.hasChildren ? (isOpen ? '▼' : '▶') : '•'}
                  </button>

                  <div className="font-semibold truncate">📁 {it.node.title || '(Group)'}</div>

                  <div className="ml-auto flex gap-2">
                    <button
                      className="border rounded px-2 py-1 text-sm hover:bg-white/10"
                      onClick={() => openCreate('group', it.node.id, it.node.title || '(Group)')}
                      title="Add subgroup"
                    >
                      + Group
                    </button>
                    <button
                      className="border rounded px-2 py-1 text-sm hover:bg-white/10"
                      onClick={() => openCreate('task', it.node.id, it.node.title || '(Group)')}
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
                        syncInBackground()
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
                        syncInBackground()
                      }}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )
            }

            // task row
            return (
              <button
                key={it.node.id}
                className="w-full text-left flex items-center gap-2 border rounded px-2 py-2 hover:bg-white/10"
                style={{ paddingLeft: pad + 28 }}
                onClick={() => {
                  setTaskModalNoteId(it.note.id)
                  setTaskModalNodeId(it.node.id)
                  setTaskModalOpen(true)
                }}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('nodeId', it.node.id)
                  e.dataTransfer.setData('kind', 'task')
                  e.dataTransfer.effectAllowed = 'move'
                }}
                
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

      <CreateNodeModal
        open={modalOpen}
        kind={modalKind}
        parentLabel={modalParentLabel}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />

      <TaskModal
        open={taskModalOpen}
        noteId={taskModalNoteId}
        onClose={() => setTaskModalOpen(false)}
        onSaved={reload}
        onDelete={
          taskModalNodeId
            ? async () => {
                // delete node + note
                await deleteTaskNodeAndNote(taskModalNodeId)
                syncInBackground()
              }
            : undefined
        }
      />
        

    </div>
  )
}
