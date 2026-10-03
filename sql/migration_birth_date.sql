-- =========================================================
-- We. — Migração: adicionar data de nascimento ao perfil
-- Rode este script no SQL Editor do seu projeto Supabase
-- (ele não apaga nem altera nenhum dado existente).
-- =========================================================
alter table public.profiles
  add column if not exists birth_date date;
