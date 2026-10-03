-- =========================================================
-- We. — Agendamento do envio automático de push (pg_cron + pg_net)
-- Rode isso DEPOIS de:
--   1. Ter rodado migration_reminders.sql
--   2. Ter publicado a Edge Function "send-reminder-push" no Dashboard (se você
--      recriar com outro nome, troque também abaixo e em js/config.js, no campo
--      WE_PUSH_FUNCTION_NAME)
--   3. Ter cadastrado os secrets VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT
-- Troque SEU_PROJETO e SUA_SERVICE_ROLE_KEY abaixo antes de rodar.
-- A service role key fica em Project Settings → API → service_role (secret).
-- =========================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove um agendamento anterior com o mesmo nome, se existir (permite rodar de novo com segurança)
select cron.unschedule(jobid) from cron.job where jobname = 'we-send-reminder-push';

select cron.schedule(
  'we-send-reminder-push',
  '* * * * *', -- todo minuto
  $$
  select net.http_post(
    url := 'https://SEU_PROJETO.supabase.co/functions/v1/send-reminder-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SUA_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Para conferir se está agendado:
-- select * from cron.job where jobname = 'we-send-reminder-push';

-- Para ver o histórico de execuções:
-- select * from cron.job_run_details order by start_time desc limit 20;
