-- Continue session: a session can carry on after a break, and a cycle is a
-- set of blocks. `parts` keeps the pieces in order, so history can show
-- "12 min study · 10 min break · 12 min study" and time per task stays right
-- when the task changes mid-session. Each element:
--   {"type": "focus", "seconds": 720, "task": "Biology"}   (task may be null)
--   {"type": "break", "seconds": 600}
-- Only "focus" pieces are study time (they add up to focus_seconds); breaks
-- never count. null = one plain session, as every row before this had.
--
-- Rows stay insert-only, so the existing insert policy and grant already cover
-- the new column. No backfill: old rows keep null.
alter table public.sessions
  add column parts jsonb
  check (parts is null or jsonb_typeof(parts) = 'array');
