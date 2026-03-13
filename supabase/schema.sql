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
