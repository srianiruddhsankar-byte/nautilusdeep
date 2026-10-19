-- Phase 10 batch 10b-1: push notifications ("Time's up").
--
-- push_subscriptions: one row per device (a browser's push endpoint), filed
--   under whoever signed in on it most recently, with that device's switches.
-- timer_pushes: the running session's upcoming alerts (the end of each focus
--   block / break, a pause running out). The app rewrites the whole list
--   whenever the session changes (lib/timer-pushes.ts); a check every 15 s
--   (the next migration) sends the ones that are due through the Edge Function
--   supabase/functions/send-push.

-- ---------- Devices ----------

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The browser's push address. Unique: one device belongs to one person at a time.
  endpoint text not null unique check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200), -- the device's encryption keys
  auth text not null check (char_length(auth) <= 100),
  -- The switches, per device. task_reminders comes with 10b-2.
  task_reminders boolean not null default false,
  times_up boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "Users can read their own devices"
  on public.push_subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Flip a switch: only your own devices, and they stay yours.
create policy "Users can update their own devices"
  on public.push_subscriptions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Signing out removes this device.
create policy "Users can delete their own devices"
  on public.push_subscriptions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- No insert grant: new devices go through save_push_subscription below.
grant select, delete on table public.push_subscriptions to authenticated;
grant update (task_reminders, times_up) on table public.push_subscriptions to authenticated;
-- The Edge Function removes devices the browser reports as gone.
grant select, delete on table public.push_subscriptions to service_role;

-- Saves this device under whoever is signed in NOW. If the same phone was
-- filed under someone else (a friend signed in before), it moves to you, so
-- their notifications can never reach you, nor yours them. Security definer
-- because that row isn't yours yet (RLS would hide it).
create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_times_up boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'Not signed in';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, times_up)
  values (me, p_endpoint, p_p256dh, p_auth, p_times_up)
  on conflict (endpoint) do update set
    user_id = excluded.user_id,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    times_up = excluded.times_up,
    -- someone else's switches don't come along with the phone
    task_reminders = case when public.push_subscriptions.user_id = excluded.user_id
      then public.push_subscriptions.task_reminders else false end,
    updated_at = now();
end;
$$;

revoke execute on function public.save_push_subscription(text, text, text, boolean) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, boolean) to authenticated;

-- ---------- A running session's alerts ----------

create table public.timer_pushes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null, -- the running session's id (it becomes the sessions row's id)
  key text not null check (char_length(key) between 1 and 20), -- which moment: 'end:3', 'pause'
  send_at timestamptz not null,
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) <= 200),
  sent_at timestamptz, -- null = still waiting; sent ones are kept a day so they're never sent twice
  created_at timestamptz not null default now(),
  unique (user_id, session_id, key)
);

-- The 15-second check looks for waiting rows that are due.
create index timer_pushes_due_idx on public.timer_pushes (send_at) where sent_at is null;

alter table public.timer_pushes enable row level security;

create policy "Users can read their own timer pushes"
  on public.timer_pushes for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own timer pushes"
  on public.timer_pushes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own timer pushes"
  on public.timer_pushes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on table public.timer_pushes to authenticated;

-- Replaces a session's waiting alerts with a new list, in one request (so the
-- app can send it with keepalive as the page is hidden) and all at once.
-- Runs as the signed-in user, so the RLS policies above still apply.
-- Alerts already sent stay sent: a new list can't bring one back.
-- p_pushes: [{ "key": "end:0", "send_at": "2026-…Z", "title": "…", "body": "…" }]
create function public.replace_timer_pushes(p_session_id uuid, p_pushes jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in';
  end if;
  if jsonb_typeof(p_pushes) <> 'array' or jsonb_array_length(p_pushes) > 100 then
    raise exception 'Expected a list of at most 100 alerts';
  end if;
  -- Two rewrites of the same session (e.g. one sent as the page hides) take turns.
  perform pg_advisory_xact_lock(hashtextextended(p_session_id::text, 0));

  delete from public.timer_pushes
  where session_id = p_session_id and sent_at is null;

  insert into public.timer_pushes (session_id, key, send_at, title, body)
  select p_session_id, x.key, x.send_at, x.title, x.body
  from jsonb_to_recordset(p_pushes) as x (key text, send_at timestamptz, title text, body text)
  where x.send_at < now() + interval '2 days'
    and not exists (
      select 1 from public.timer_pushes t
      where t.session_id = p_session_id and t.key = x.key
    );
end;
$$;

revoke execute on function public.replace_timer_pushes(uuid, jsonb) from public, anon;
grant execute on function public.replace_timer_pushes(uuid, jsonb) to authenticated;

-- ---------- Sending (server only) ----------

-- Is anything due for someone who wants it? The 15-second check calls the Edge
-- Function only when this is true. Alerts more than 10 minutes late are stale.
create function public.timer_pushes_due()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.timer_pushes p
    join public.push_subscriptions s on s.user_id = p.user_id and s.times_up
    where p.sent_at is null
      and p.send_at <= now()
      and p.send_at > now() - interval '10 minutes'
  );
$$;

-- Takes every due alert and marks it sent in ONE statement. Rows another
-- check is already taking are skipped (skip locked), so two overlapping checks
-- can never send the same alert twice. Returns one row per device to notify:
-- only devices with "Time's up" on, only the newest alert per session, never
-- a stale one, and never for a session that has already been saved as
-- finished (a backup in case the app's last rewrite didn't arrive).
create function public.claim_due_pushes()
returns table (endpoint text, p256dh text, auth text, title text, body text, session_id uuid)
language sql
security definer
set search_path = ''
as $$
  with due as (
    update public.timer_pushes t
    set sent_at = now()
    where t.id in (
      select d.id from public.timer_pushes d
      where d.sent_at is null and d.send_at <= now()
      for update skip locked
    )
    returning t.user_id, t.session_id, t.title, t.body, t.send_at
  )
  select distinct on (s.endpoint, due.session_id)
    s.endpoint, s.p256dh, s.auth, due.title, due.body, due.session_id
  from due
  join public.push_subscriptions s on s.user_id = due.user_id and s.times_up
  where due.send_at > now() - interval '10 minutes'
    and not exists (select 1 from public.sessions x where x.id = due.session_id)
  order by s.endpoint, due.session_id, due.send_at desc;
$$;

-- Sent and stale alerts older than a day are deleted (hourly, next migration).
create function public.tidy_timer_pushes()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.timer_pushes where send_at < now() - interval '1 day';
$$;

-- Only the server may call these: never a signed-in user or a visitor.
-- (The 15-second check runs as the database owner, which needs no grant.)
revoke execute on function public.timer_pushes_due() from public, anon, authenticated;
revoke execute on function public.claim_due_pushes() from public, anon, authenticated;
revoke execute on function public.tidy_timer_pushes() from public, anon, authenticated;
grant execute on function public.claim_due_pushes() to service_role;
