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
  tags: string[]
  pinned: 0 | 1
  priority: number
  urgent: 0 | 1
  is_private: 0 | 1
  start_at: string | null
  completed_at: string | null
  notebook_id: string | null
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

export type Notebook = {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export type ProjectNodeKind = 'group' | 'task'

export type ProjectNodeRow = {
  id: string
  project_id: string
  parent_id: string | null
  kind: ProjectNodeKind
  title: string
  note_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type ProjectTaskNode = ProjectNodeRow & {
  note: Note // joined task note
}

export type ProjectNode = ProjectNodeRow | ProjectTaskNode

export type BlogCategory = {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export type BlogPostStatus = 'draft' | 'published'

export type BlogPostRow = {
  id: string
  title: string
  slug: string
  category_id: string
  excerpt: string
  content: string
  cover_file_id: string | null
  status: BlogPostStatus
  created_at: string
  updated_at: string
  published_at: string | null
}

export type BlogFile = {
  id: string
  post_id: string
  filename: string
  mime: string
  size: number
  data_base64: string
  role: 'cover' | 'inline'
  created_at: string
}

export type BlogPost = BlogPostRow & {
  category_name: string
  cover_file?: BlogFile | null
}

export type FinanceCategory = {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export type FinanceSubcategory = {
  id: string
  category_id: string
  name: string
  created_at: string
  updated_at: string
}

export type FinanceExpense = {
  id: string
  date: string
  title: string
  amount: number
  category_id: string
  subcategory_id: string | null
  note: string
  tags: string[]
  created_at: string
  updated_at: string
}

export type FinanceExpenseWithRefs = FinanceExpense & {
  category_name: string
  subcategory_name: string | null
}

export type GoalStatus = 'open' | 'done' | 'archived'

export type Goal = {
  id: string
  parent_id: string | null
  title: string
  description: string
  status: GoalStatus
  progress: number
  start_date: string
  end_date: string
  color: string | null
  created_at: string
  updated_at: string
}
