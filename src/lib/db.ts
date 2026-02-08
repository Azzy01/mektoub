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

    // Notebooks table
    await db.exec(`
    CREATE TABLE IF NOT EXISTS notebooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_notebooks_name ON notebooks(name);
    `)

    // notebook_id on notes
    await db.exec(`
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS notebook_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_notes_notebook_id ON notes(notebook_id);
    `)

    
    await db.exec(`
    CREATE TABLE IF NOT EXISTS project_nodes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,        -- notes.id of the project
      parent_id TEXT,                  -- project_nodes.id (null => root-level under project)
      kind TEXT NOT NULL,              -- 'group' | 'task'
      title TEXT NOT NULL DEFAULT '',  -- used for groups (tasks can keep empty)
      note_id TEXT,                    -- notes.id for task nodes (null for groups)
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  
    CREATE INDEX IF NOT EXISTS idx_project_nodes_project_id ON project_nodes(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_nodes_parent_id ON project_nodes(parent_id);
    CREATE INDEX IF NOT EXISTS idx_project_nodes_sort_order ON project_nodes(project_id, parent_id, sort_order);
  `);
  
  // Blog tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS blog_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_categories_name ON blog_categories(name);
  `)

  await db.exec(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      category_id TEXT NOT NULL,
      excerpt TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      cover_file_id TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      published_at TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_category_id ON blog_posts(category_id);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_updated_at ON blog_posts(updated_at);
  `)

  await db.exec(`
    CREATE TABLE IF NOT EXISTS blog_files (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime TEXT NOT NULL,
      size INTEGER NOT NULL,
      data_base64 TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'inline', -- 'cover' | 'inline'
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_blog_files_post_id ON blog_files(post_id);
    CREATE INDEX IF NOT EXISTS idx_blog_files_role ON blog_files(role);
  `)

}

