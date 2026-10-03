-- =========================================================
-- We. — Agenda familiar compartilhada
-- Schema + RLS para Supabase (Postgres)
-- Execute este arquivo inteiro no SQL Editor do seu projeto Supabase.
-- =========================================================

-- Extensão para gen_random_uuid()
create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- PROFILES (1 linha por usuário autenticado)
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null default '',
  phone text,
  birth_date date,
  avatar_url text,
  avatar_color text,
  family_role text,
  family_role_custom text,
  gender text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- FAMILIES
-- ---------------------------------------------------------
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- FAMILY MEMBERS
-- ---------------------------------------------------------
create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'active' check (status in ('active', 'pending')),
  created_at timestamptz not null default now(),
  unique (family_id, user_id)
);

-- ---------------------------------------------------------
-- INVITATIONS
-- ---------------------------------------------------------
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  invited_email text not null,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- EVENTS
-- ---------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  category text not null default 'outros',
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  all_day boolean not null default false,
  location text,
  latitude double precision,
  longitude double precision,
  notes text,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  reminder_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- EVENT PARTICIPANTS
-- ---------------------------------------------------------
create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'participante' check (role in ('responsavel', 'acompanhante', 'participante', 'convidado')),
  response_status text not null default 'pending' check (response_status in ('pending', 'accepted', 'declined')),
  responded_at timestamptz,
  unique (event_id, user_id)
);

-- ---------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  event_id uuid references public.events (id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- PUSH SUBSCRIPTIONS (notificações push do navegador/celular)
-- ---------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- =========================================================
-- HELPER FUNCTIONS (security definer para evitar recursão em RLS)
-- =========================================================
create or replace function public.is_family_member(fam_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_id = fam_id and fm.user_id = auth.uid() and fm.status = 'active'
  );
$$;

create or replace function public.is_family_admin(fam_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_id = fam_id and fm.user_id = auth.uid() and fm.role = 'admin' and fm.status = 'active'
  );
$$;

create or replace function public.shares_family_with(other_user uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members fm1
    join public.family_members fm2 on fm1.family_id = fm2.family_id
    where fm1.user_id = auth.uid() and fm2.user_id = other_user
  );
$$;

create or replace function public.event_family(ev_id uuid)
returns uuid
language sql
security definer
set search_path = public
as $$
  select family_id from public.events where id = ev_id;
$$;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.invitations enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

-- PROFILES ------------------------------------------------
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.shares_family_with(id));

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

-- FAMILIES --------------------------------------------------
drop policy if exists "families_select" on public.families;
create policy "families_select" on public.families
  for select using (public.is_family_member(id) or owner_id = auth.uid());

drop policy if exists "families_insert" on public.families;
create policy "families_insert" on public.families
  for insert with check (owner_id = auth.uid());

drop policy if exists "families_update" on public.families;
create policy "families_update" on public.families
  for update using (public.is_family_admin(id));

-- FAMILY MEMBERS ---------------------------------------------
drop policy if exists "family_members_select" on public.family_members;
create policy "family_members_select" on public.family_members
  for select using (public.is_family_member(family_id));

drop policy if exists "family_members_insert_self" on public.family_members;
create policy "family_members_insert_self" on public.family_members
  for insert with check (
    user_id = auth.uid()
    and (
      exists (select 1 from public.families f where f.id = family_id and f.owner_id = auth.uid())
      or exists (
        select 1 from public.invitations i
        where i.family_id = family_members.family_id
          and i.invited_email = (auth.jwt() ->> 'email')
          and i.status = 'pending'
      )
    )
  );

drop policy if exists "family_members_update" on public.family_members;
create policy "family_members_update" on public.family_members
  for update using (public.is_family_admin(family_id) or user_id = auth.uid());

drop policy if exists "family_members_delete" on public.family_members;
create policy "family_members_delete" on public.family_members
  for delete using (public.is_family_admin(family_id));

-- INVITATIONS --------------------------------------------------
drop policy if exists "invitations_select" on public.invitations;
create policy "invitations_select" on public.invitations
  for select using (
    invited_by = auth.uid()
    or invited_email = (auth.jwt() ->> 'email')
    or public.is_family_member(family_id)
  );

-- Permite que qualquer visitante (sem conta ainda) veja um convite PENDENTE
-- pelo token — necessário para quem clica no link do email de convite antes
-- de se cadastrar. Seguro porque o token é um UUID aleatório (link mágico).
drop policy if exists "invitations_select_public_pending" on public.invitations;
create policy "invitations_select_public_pending" on public.invitations
  for select using (status = 'pending');

drop policy if exists "invitations_insert" on public.invitations;
create policy "invitations_insert" on public.invitations
  for insert with check (invited_by = auth.uid() and public.is_family_member(family_id));

drop policy if exists "invitations_update" on public.invitations;
create policy "invitations_update" on public.invitations
  for update using (
    invited_email = (auth.jwt() ->> 'email')
    or public.is_family_admin(family_id)
  );

drop policy if exists "invitations_delete" on public.invitations;
create policy "invitations_delete" on public.invitations
  for delete using (
    invited_by = auth.uid()
    or public.is_family_admin(family_id)
  );

-- EVENTS --------------------------------------------------
drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events
  for select using (public.is_family_member(family_id));

drop policy if exists "events_insert" on public.events;
create policy "events_insert" on public.events
  for insert with check (created_by = auth.uid() and public.is_family_member(family_id));

drop policy if exists "events_update" on public.events;
create policy "events_update" on public.events
  for update using (created_by = auth.uid() or public.is_family_admin(family_id));

drop policy if exists "events_delete" on public.events;
create policy "events_delete" on public.events
  for delete using (created_by = auth.uid() or public.is_family_admin(family_id));

-- EVENT PARTICIPANTS --------------------------------------------------
drop policy if exists "participants_select" on public.event_participants;
create policy "participants_select" on public.event_participants
  for select using (public.is_family_member(public.event_family(event_id)));

drop policy if exists "participants_insert" on public.event_participants;
create policy "participants_insert" on public.event_participants
  for insert with check (public.is_family_member(public.event_family(event_id)));

drop policy if exists "participants_update" on public.event_participants;
create policy "participants_update" on public.event_participants
  for update using (
    user_id = auth.uid()
    or exists (select 1 from public.events e where e.id = event_id and e.created_by = auth.uid())
  );

drop policy if exists "participants_delete" on public.event_participants;
create policy "participants_delete" on public.event_participants
  for delete using (
    exists (select 1 from public.events e where e.id = event_id and e.created_by = auth.uid())
  );

-- NOTIFICATIONS --------------------------------------------------
drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert" on public.notifications
  for insert with check (public.shares_family_with(user_id) or user_id = auth.uid());

drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications
  for update using (user_id = auth.uid());

-- PUSH SUBSCRIPTIONS --------------------------------------------------
drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (user_id = auth.uid());

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (user_id = auth.uid());

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (user_id = auth.uid());

create index if not exists events_reminder_lookup_idx
  on public.events (start_datetime)
  where status = 'active' and reminder_minutes is not null;

-- PUSH REMINDER LOG (evita reenviar o mesmo lembrete push; só a Edge Function acessa) ------
create table if not exists public.push_reminder_log (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table public.push_reminder_log enable row level security;
-- Nenhuma policy: só a service role (usada pela Edge Function) acessa esta tabela.

-- =========================================================
-- STORAGE (avatares)
-- =========================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar_public_read" on storage.objects;
create policy "avatar_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatar_upload_own" on storage.objects;
create policy "avatar_upload_own" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid() is not null);

drop policy if exists "avatar_update_own" on storage.objects;
create policy "avatar_update_own" on storage.objects
  for update using (bucket_id = 'avatars' and owner = auth.uid());

-- =========================================================
-- REALTIME (opcional, mas recomendado para atualizações ao vivo)
-- =========================================================
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.event_participants;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.family_members;

-- Fim do schema.
