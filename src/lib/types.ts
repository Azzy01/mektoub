export type NoteType = 'idea' | 'project' | 'task' | 'list' | 'file'
export type NoteStatus = 'open' | 'done' | 'archived'

export type Note = {
    id: string
    type: NoteType
    title: string
    content: string
    status: NoteStatus
    due_at: string | null
    project_id: string | null
    tags: string[]            // ✅ add this
    pinned: 0 | 1
    priority: number
    urgent: 0 | 1
    created_at: string
    updated_at: string
  }
  

export type ListItem = {
  id: string
  note_id: string
  text: string
  done: 0 | 1
  sort_order: number
  created_at: string
  updated_at: string
}

export type FileRow = {
  id: string
  note_id: string
  filename: string
  mime: string
  size: number
  data_base64: string
  created_at: string
}
