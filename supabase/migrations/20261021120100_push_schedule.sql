-- Phase 10 batch 10b-1, part 2: the 15-second check that sends due pushes.
-- Run AFTER 20261021120000_push.sql and after creating the Edge Function.
--
-- !! This file is committed with PLACEHOLDERS. In the Supabase SQL Editor,
-- !! replace the two <...> values below before running it, and never commit
-- !! the real ones. They are stored in Supabase Vault (encrypted), not in a table.

create extension if not exists pg_cron;
create extension if not exists pg_net; -- lets the database make HTTP requests

-- Where the Edge Function lives, and the shared secret it checks.
select vault.create_secret('https://<your-project-ref>.supabase.co', 'project_url');
select vault.create_secret('<the CRON_SECRET you set in Edge Function secrets>', 'push_cron_secret');

-- Every 15 seconds: if something is due, call the Edge Function (it does the
-- sending). Most of the time nothing is due and this costs almost nothing.
select cron.schedule(
  'send-due-pushes',
  '15 seconds',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  )
  where public.timer_pushes_due();
  $$
);

-- Every hour: delete alerts older than a day.
select cron.schedule('tidy-timer-pushes', '7 * * * *', 'select public.tidy_timer_pushes()');

-- To check it's working:   select * from cron.job_run_details order by start_time desc limit 10;
-- Edge Function replies:   select * from net._http_response order by created desc limit 10;
-- To stop it:              select cron.unschedule('send-due-pushes');
