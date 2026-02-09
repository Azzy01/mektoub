'use client'

import type { NoteStatus, NoteType } from '../../types'

export type ListNotesParams = {
  type?: NoteType | 'all'
  q?: string
  projectId?: string | 'all' | 'none'
  notebookId?: string | 'all' | 'none'
  status?: NoteStatus | 'all'
  hideProjectTasks?: boolean
  includePrivate?: boolean
}
