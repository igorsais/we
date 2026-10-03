-- =========================================================
-- We. — Migração: permitir cancelar convites parados em "pendente"
-- =========================================================
-- Rode isso no SQL Editor do Supabase (cole e clique em Run).
--
-- Até agora não existia nenhuma política de DELETE na tabela de convites,
-- então não era possível remover um convite pelo app (só pelo banco). Isso
-- adiciona a permissão: quem criou o convite, ou qualquer administrador da
-- família, pode cancelá-lo.
drop policy if exists "invitations_delete" on public.invitations;
create policy "invitations_delete" on public.invitations
  for delete using (
    invited_by = auth.uid()
    or public.is_family_admin(family_id)
  );
