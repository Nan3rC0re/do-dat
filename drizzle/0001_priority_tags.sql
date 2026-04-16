-- Migration: add priority column, tags table, task_tags junction table
-- Run via: npm run db:migrate

-- Priority enum + column on tasks
DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('no_priority', 'low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority task_priority NOT NULL DEFAULT 'no_priority';

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'slate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own tags" ON tags FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own tags" ON tags FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own tags" ON tags FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own tags" ON tags FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Server role full access for tags" ON tags FOR ALL
    USING (current_user = 'postgres') WITH CHECK (current_user = 'postgres');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS tags_user_id_idx ON tags(user_id);

-- Task-Tag junction table
CREATE TABLE IF NOT EXISTS task_tags (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "task_tags owner access" ON task_tags FOR ALL
    USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_tags.task_id AND tasks.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Server role full access for task_tags" ON task_tags FOR ALL
    USING (current_user = 'postgres') WITH CHECK (current_user = 'postgres');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
