-- =========================================================
-- We. — Migração: campo de gênero no perfil
-- =========================================================
-- Rode isso no SQL Editor do Supabase (cole e clique em Run).
-- Adiciona a coluna "gender" na tabela de perfis — usada pra escolher o
-- esquema de cores do app (rosa/vinho ou azul).
alter table public.profiles add column if not exists gender text;
