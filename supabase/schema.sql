-- Run this in the Supabase SQL editor

-- Create the task_status enum
create type task_status as enum ('not_started', 'in_progress', 'completed');

-- Create the tasks table
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status task_status not null default 'not_started',
  due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table tasks enable row level security;

-- Policy: users can only see their own tasks
create policy "Users can view own tasks"
  on tasks for select
  using (auth.uid() = user_id);

-- Policy: users can insert their own tasks
create policy "Users can insert own tasks"
  on tasks for insert
  with check (auth.uid() = user_id);

-- Policy: users can update their own tasks
create policy "Users can update own tasks"
  on tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: users can delete their own tasks
create policy "Users can delete own tasks"
  on tasks for delete
  using (auth.uid() = user_id);

-- Policy: allow server connection (Drizzle with DATABASE_URL) to access tasks.
-- Your app uses a direct Postgres connection with no JWT, so auth.uid() is not set
-- and the policies above fail with "Tenant or user not found". The server already
-- enforces user_id in every query, so allowing the DB role (postgres) is safe.
create policy "Server role full access for tasks"
  on tasks for all
  using (current_user = 'postgres')
  with check (current_user = 'postgres');

-- Index for faster user queries
create index if not exists tasks_user_id_idx on tasks(user_id);
create index if not exists tasks_user_status_idx on tasks(user_id, status);

-- =============================================================================
-- BLOCK A: groups table + RLS
-- Run this block first (before Block B)
-- =============================================================================
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
alter table groups enable row level security;
create policy "Users can view own groups" on groups for select using (auth.uid() = user_id);
create policy "Users can insert own groups" on groups for insert with check (auth.uid() = user_id);
create policy "Users can update own groups" on groups for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own groups" on groups for delete using (auth.uid() = user_id);
-- CRITICAL: server bypass (auth.uid() is NULL on direct Postgres connections via DATABASE_URL)
-- The app uses Drizzle with a direct Postgres connection (Transaction Pooler, port 6543).
-- This means auth.uid() is never set and the policies above will block every server request.
-- The server already enforces user_id in every query, so this bypass is safe.
create policy "Server role full access for groups" on groups for all
  using (current_user = 'postgres') with check (current_user = 'postgres');
create index if not exists groups_user_id_idx on groups(user_id);

-- =============================================================================
-- BLOCK B: tasks migration — add group_id FK
-- Run this block after Block A
-- =============================================================================
alter table tasks add column if not exists group_id uuid references groups(id) on delete set null;
create index if not exists tasks_group_id_idx on tasks(group_id);

-- =============================================================================
-- BLOCK C: NEW TABLE CHECKLIST (copy-paste template for every future table)
-- =============================================================================
-- WHY THIS EXISTS:
--   This app uses a direct Postgres connection (DATABASE_URL, Transaction Pooler
--   port 6543) via Drizzle ORM — NOT Supabase's JWT API. This means auth.uid()
--   is ALWAYS NULL on server requests. Every table's standard RLS policies that
--   check `auth.uid() = user_id` will silently block all server queries, causing
--   the Vercel "server-side exception" digest error.
--
-- THE 3-STEP REQUIREMENT for every new table:
--   1. Define the table in src/lib/db/schema.ts
--   2. Run `npx drizzle-kit push` to sync the Drizzle schema
--   3. Run SQL in Supabase editor WITH the server bypass policy below
--
-- TEMPLATE — replace `your_table` with the actual table name:
-- ------------------------------------------------------------
-- alter table your_table enable row level security;
-- create policy "Users can view own your_table" on your_table for select using (auth.uid() = user_id);
-- create policy "Users can insert own your_table" on your_table for insert with check (auth.uid() = user_id);
-- create policy "Users can update own your_table" on your_table for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- create policy "Users can delete own your_table" on your_table for delete using (auth.uid() = user_id);
-- -- CRITICAL: without this, all server requests are blocked (auth.uid() is NULL)
-- create policy "Server role full access for your_table" on your_table for all
--   using (current_user = 'postgres') with check (current_user = 'postgres');
-- ------------------------------------------------------------
