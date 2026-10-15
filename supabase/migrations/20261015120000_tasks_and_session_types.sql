-- Phase 6: a task list, plus session type / task / target time on each session.

-- ---------- Tasks ----------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  done_at timestamptz, -- null = still to do
  created_at timestamptz not null default now()
);

create index tasks_user_created_at_idx on public.tasks (user_id, created_at);

alter table public.tasks enable row level security;

-- Read: you only ever see rows whose user_id is your own.
create policy "Users can read their own tasks"
  on public.tasks for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Add: a new row must carry your own user_id (you can't create tasks for someone else).
create policy "Users can insert their own tasks"
  on public.tasks for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Change (mark done / not done): `using` picks which rows you may change (your own);
-- `with check` tests the row after the change, so you can't hand a task to another user.
create policy "Users can update their own tasks"
  on public.tasks for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Delete: only your own rows.
create policy "Users can delete their own tasks"
  on public.tasks for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Expose the table to the Data API for signed-in users only. RLS above still decides which rows.
grant select, insert, update, delete on table public.tasks to authenticated;

-- ---------- Sessions: type, task and target ----------

-- Every existing row gets the defaults: a Study session with no task and no target.
alter table public.sessions
  add column session_type text not null default 'study' check (session_type in ('study', 'notes')),
  -- The task's NAME at the time, not a link to public.tasks: a session waiting in the
  -- offline queue can't break if its task is deleted, and deleting a task keeps its stats.
  add column task_name text check (char_length(task_name) between 1 and 100),
  -- Optional "finish in N minutes" for notes sessions.
  add column target_minutes integer check (target_minutes between 1 and 600),
  add constraint sessions_target_only_for_notes check (target_minutes is null or session_type = 'notes');

-- No new grants for sessions: the existing select/insert grant covers the new columns.
