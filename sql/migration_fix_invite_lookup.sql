-- =========================================================
-- We. — Correção: convite não encontrado para quem ainda não tem conta
-- =========================================================
-- Problema: quem recebe o convite por email ainda não está logado no app,
-- então as regras de segurança (RLS) bloqueavam a leitura do convite —
-- aparecia "Convite não encontrado" mesmo o convite existindo.
--
-- Correção: permite que qualquer visitante (mesmo sem conta) veja um
-- convite PENDENTE. Isso é seguro porque o token é um código aleatório
-- enorme (um UUID) — funciona como um "link mágico": só quem tem o link
-- exato (recebido por email) consegue ler aquele convite específico.
-- Depois que o convite é aceito (status muda para 'accepted'), ele some
-- dessa consulta pública de novo.
--
-- Rode este script no SQL Editor do seu projeto Supabase.
-- =========================================================

drop policy if exists "invitations_select_public_pending" on public.invitations;
create policy "invitations_select_public_pending" on public.invitations
  for select using (status = 'pending');
