'use client'

import type { Note } from '../../types'
import { parseTags } from '../tags'

export function mapNoteRow(row: any): Note {
  return {
    ...row,
    tags: parseTags(row.tags),
  } as Note
}
