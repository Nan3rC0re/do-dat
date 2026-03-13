-- Fix: "Tenant or user not found" when using Drizzle with DATABASE_URL.
-- Run this in the Supabase SQL editor if your app is already deployed.

create policy "Server role full access for tasks"
  on tasks for all
  using (current_user = 'postgres')
  with check (current_user = 'postgres');
