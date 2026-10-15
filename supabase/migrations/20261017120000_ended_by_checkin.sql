-- Night mode: a session can now end because a "Still studying?" check-in went
-- unanswered (ended_by = 'checkin'). Its credited focus time stops at the last
-- confirmed check-in. Stored so the raw record says how it ended.

-- The check constraint was created inline in the first migration, so Postgres
-- named it sessions_ended_by_check. Swap it for one that also allows 'checkin'.
alter table public.sessions
  drop constraint sessions_ended_by_check,
  add constraint sessions_ended_by_check check (ended_by in ('finished', 'stopped', 'left', 'checkin'));
