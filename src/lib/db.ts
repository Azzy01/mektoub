'use client'

import { PGlite } from '@electric-sql/pglite'

let dbPromise: Promise<PGlite> | null = null

export function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      // Persist to IndexedDB (offline-first)
      const db = new PGlite('idb://mektoub-pgdata-v2') // official persistence format :contentReference[oaicite:2]{index=2}
      await migrate(db)
      return db
    })()
  }
  return dbPromise
}

async function migrate(db: PGlite) {
  // exec is good for migrations / multiple statements :contentReference[oaicite:3]{index=3}
  await db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,              -- idea | project | task | list | file
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open', -- open | done | archived
      due_at TEXT,                     -- ISO string
      project_id TEXT,                 -- references notes(id) when type=project
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);
    CREATE INDEX IF NOT EXISTS idx_notes_project_id ON notes(project_id);
    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);

    CREATE TABLE IF NOT EXISTS list_items (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      text TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_list_items_note_id ON list_items(note_id);

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime TEXT NOT NULL,
      size INTEGER NOT NULL,
      data_base64 TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_files_note_id ON files(note_id);
  `)

    // Tags support (stored as JSON string array)
    await db.exec(`
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS tags TEXT NOT NULL DEFAULT '[]';
  `)

    await db.exec(`
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS pinned INTEGER NOT NULL DEFAULT 0;
  `)

    await db.exec(`
      ALTER TABLE notes ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 3;
    `)

    await db.exec(`
      ALTER TABLE notes ADD COLUMN IF NOT EXISTS urgent INTEGER NOT NULL DEFAULT 0;
    `)



}
