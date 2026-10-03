-- =========================================================
-- We. — Corrige manualmente quem acabou em família errada
-- =========================================================
-- Use isso para a pessoa que já se cadastrou e, por causa do bug do link de
-- confirmação, acabou criando (e entrando em) uma família própria em vez de
-- entrar na sua família já existente.
--
-- PREENCHA ANTES DE RODAR:
--   1. email_convidado  → o email da pessoa que entrou na família errada
--   2. nome_familia_certa → o nome exato da família correta (ex: 'Família SAIS')
-- =========================================================

do $$
declare
  v_user_id uuid;
  v_wrong_family_id uuid;
  v_correct_family_id uuid;
  v_email text := 'EMAIL_DA_PESSOA_AQUI';        -- <-- preencha
  v_correct_family text := 'Família SAIS';        -- <-- preencha (nome exato)
begin
  select id into v_user_id from public.profiles where email = v_email;
  if v_user_id is null then
    raise exception 'Nenhum perfil encontrado com o email %', v_email;
  end if;

  select id into v_correct_family_id from public.families where name = v_correct_family;
  if v_correct_family_id is null then
    raise exception 'Nenhuma família encontrada com o nome %', v_correct_family;
  end if;

  -- Família errada que essa pessoa acabou criando (ela é a owner dessa família,
  -- e só ela é membro dela)
  select family_id into v_wrong_family_id
  from public.family_members
  where user_id = v_user_id and family_id <> v_correct_family_id
  limit 1;

  -- Move a pessoa para a família correta, como membro comum
  update public.family_members
  set family_id = v_correct_family_id, role = 'member'
  where user_id = v_user_id and family_id <> v_correct_family_id;

  -- Marca o convite original como aceito (se ainda estava pendente)
  update public.invitations
  set status = 'accepted'
  where invited_email = v_email and status = 'pending';

  -- Remove a família errada que ela criou por engano (só se não sobrou ninguém nela)
  if v_wrong_family_id is not null then
    delete from public.families
    where id = v_wrong_family_id
      and not exists (select 1 from public.family_members where family_id = v_wrong_family_id);
  end if;

  raise notice 'Pessoa % movida para a família %', v_email, v_correct_family;
end $$;
