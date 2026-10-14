-- Phase 3: one row per finished focus session (raw record; stats are derived later).

create table public.sessions (
  -- Generated on the client when the session starts, so a retried save of the
  -- same session hits the same primary key and can't create a duplicate.
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  mode text not null check (mode in ('timer', 'stopwatch', 'cycle')),
  focus_mode text not null check (focus_mode in ('deep', 'open')),
  -- partial = a cycle that ended early with some blocks banked
  outcome text not null check (outcome in ('completed', 'failed', 'partial')),
  -- finished = ran to the end, stopped = Stop/Give up/End session, left = left the app
  ended_by text not null check (ended_by in ('finished', 'stopped', 'left')),

  started_at timestamptz not null,
  ended_at timestamptz not null,
  -- Seconds, not minutes: rounding each session down would make totals drift low.
  focus_seconds integer not null check (focus_seconds >= 0),

  blocks_completed integer check (blocks_completed >= 0),
  blocks_planned integer check (blocks_planned >= 1),
  planned_minutes integer check (planned_minutes >= 1), -- null for the stopwatch

  created_at timestamptz not null default now(),

  constraint sessions_ended_after_start check (ended_at >= started_at),
  -- Block counts are filled in for cycle mode and only for cycle mode.
  constraint sessions_blocks_only_for_cycle check (
    (mode = 'cycle') = (blocks_completed is not null and blocks_planned is not null)
  )
);

-- "My most recent sessions" is the main query.
create index sessions_user_ended_at_idx on public.sessions (user_id, ended_at desc);

-- Row Level Security (already automatic for new tables; stated here so the file is complete).
alter table public.sessions enable row level security;

-- Signed-in users can read only rows whose user_id is their own.
create policy "Users can read their own sessions"
  on public.sessions for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Signed-in users can add rows only with their own user_id (no saving as someone else).
create policy "Users can insert their own sessions"
  on public.sessions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- No update/delete policies: with RLS on, those are denied for everyone.

-- New tables aren't exposed to the Data API automatically any more: grant only what the
-- app uses. RLS above still decides which rows. Signed-out visitors (anon) get nothing.
grant select, insert on table public.sessions to authenticated;
