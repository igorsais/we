-- =========================================================
-- We. — Migração: lembretes de compromisso + notificações push
-- Rode este script no SQL Editor do seu projeto Supabase.
-- Não apaga nem altera nenhum dado existente.
-- =========================================================

-- Frequência do lembrete (em minutos antes do início). NULL = sem lembrete.
alter table public.events
  add column if not exists reminder_minutes integer;

-- Assinaturas de push (uma por navegador/dispositivo em que a pessoa ativou notificações)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (user_id = auth.uid());

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (user_id = auth.uid());

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (user_id = auth.uid());

-- Índice para a function de lembretes encontrar rapidamente compromissos que estão para começar
create index if not exists events_reminder_lookup_idx
  on public.events (start_datetime)
  where status = 'active' and reminder_minutes is not null;

-- Log de push já enviado (evita mandar o mesmo lembrete duas vezes para o mesmo usuário).
-- Usado só pela Edge Function (acesso via service role); não precisa de RLS para o app.
create table if not exists public.push_reminder_log (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table public.push_reminder_log enable row level security;
-- Nenhuma policy: só a service role (usada pela Edge Function) acessa esta tabela.
