CREATE TABLE IF NOT EXISTS auth_tokens (
  token TEXT PRIMARY KEY,
  created_at TIMESTAMP NOT NULL,
  last_used_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  due_at TEXT,
  project_id TEXT,
  notebook_id TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  pinned INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 3,
  urgent INTEGER NOT NULL DEFAULT 0,
  is_private INTEGER NOT NULL DEFAULT 0,
  start_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS list_items (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  text TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  data_base64 TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notebooks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS updated_at TEXT;
UPDATE notebooks SET updated_at = created_at WHERE updated_at IS NULL;

CREATE TABLE IF NOT EXISTS project_nodes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  parent_id TEXT,
  kind TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  note_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blog_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

ALTER TABLE blog_categories ADD COLUMN IF NOT EXISTS updated_at TEXT;
UPDATE blog_categories SET updated_at = created_at WHERE updated_at IS NULL;

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

CREATE TABLE IF NOT EXISTS blog_files (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  data_base64 TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'inline',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deleted_rows (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,
  deleted_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'idx_deleted_rows_table_row'
      AND n.nspname = 'public'
  ) THEN
    CREATE UNIQUE INDEX idx_deleted_rows_table_row ON deleted_rows(table_name, row_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'idx_deleted_rows_updated_at'
      AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_deleted_rows_updated_at ON deleted_rows(updated_at);
  END IF;
END
$$;
