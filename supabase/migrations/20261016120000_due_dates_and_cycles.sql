-- Phase 6 part 2: due dates and unique names for tasks, saved cycles, and the cycle's name on sessions.

-- ---------- Tasks ----------

-- A plain calendar date ("2026-10-21"), no time or time zone: "due Wednesday" means
-- Wednesday wherever you are.
alter table public.tasks add column due_date date;

-- Task names are unique among a user's tasks that AREN'T done, ignoring case
-- ("Biochem" = "biochem"), so a session's task name points at one open task (used by
-- "Mark done" on the result screen). This is a partial index: done tasks are left out,
-- so a repeating task like "Read 20 pages" can be added again after it's done, and
-- every completion stays in history.
create unique index tasks_user_open_name_key on public.tasks (user_id, lower(name)) where done_at is null;

-- ---------- Saved cycles ----------

create table public.cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  -- An ordered list of blocks, e.g.
  -- [{"type":"repeat","times":4,"blocks":[{"type":"focus","minutes":25},{"type":"break","minutes":5}]},
  --  {"type":"longBreak","minutes":15}]
  -- The app checks the shape (lib/cycle-blocks.ts); the database only checks it's a short list.
  blocks jsonb not null check (jsonb_typeof(blocks) = 'array' and jsonb_array_length(blocks) between 1 and 20),
  created_at timestamptz not null default now()
);

create unique index cycles_user_name_key on public.cycles (user_id, lower(name));

alter table public.cycles enable row level security;

-- Read: you only see your own saved cycles (the premade ones live in the app's code).
create policy "Users can read their own cycles"
  on public.cycles for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Save: a new cycle must carry your own user_id.
create policy "Users can insert their own cycles"
  on public.cycles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Delete: only your own cycles.
create policy "Users can delete their own cycles"
  on public.cycles for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- No update policy: cycles can't be edited, only saved and deleted (so no update grant either).
grant select, insert, delete on table public.cycles to authenticated;

-- ---------- Sessions: which cycle ----------

-- The cycle's NAME at the time (like task_name): deleting a saved cycle keeps its stats.
-- Null for timers, stopwatches, and cycles that weren't saved ("Custom").
alter table public.sessions
  add column cycle_name text check (char_length(cycle_name) between 1 and 40),
  add constraint sessions_cycle_name_only_for_cycles check (cycle_name is null or mode = 'cycle');
