# We. — Como ativar o app (gratuito, ~5 minutos)

O We. é um app real (não um mockup): as contas, os perfis, a família e os compromissos
ficam guardados em um banco de dados de verdade. Para isso ele usa o **Supabase**, que
tem um plano gratuito mais do que suficiente para uma família usar o app.

## Passo 1 — Criar o projeto gratuito no Supabase

1. Acesse https://supabase.com e crie uma conta (dá para entrar com o Google).
2. Clique em **New project**.
3. Escolha um nome (ex: `we-familia`), uma senha para o banco (guarde-a) e a região mais
   próxima (ex: South America — São Paulo).
4. Aguarde ~2 minutos enquanto o projeto é criado.

## Passo 2 — Rodar o script do banco de dados

1. No painel do projeto, abra **SQL Editor** (menu lateral).
2. Clique em **New query**.
3. Cole todo o conteúdo do arquivo `sql/schema.sql` (enviado junto com este projeto) e
   clique em **Run**.
   - Isso cria as tabelas de usuários, famílias, convites, compromissos, participantes e
     notificações, já com as regras de segurança (cada família só vê os próprios dados).
   - Também cria o espaço de armazenamento gratuito para as fotos de perfil.

## Passo 3 — Pegar a URL e a chave do projeto

1. No painel, vá em **Project Settings → API**.
2. Copie os dois valores:
   - **Project URL**
   - **anon public key**

## Passo 4 — Me envie esses dois valores

Cole aqui na conversa a **Project URL** e a **anon public key**. Eu edito o arquivo
`js/config.js` com esses dados e publico a versão final do We., já pronta para uso —
inclusive para os outros membros da família, direto pelo link.

> A "anon key" é feita para ser pública (é assim que o Supabase recomenda usar em apps
> como este) — quem protege os dados de verdade são as regras de segurança já criadas
> pelo script SQL.

## (Opcional) Facilitar os testes

Por padrão, o Supabase exige que cada novo cadastro confirme o email antes de conseguir
entrar. Para testar mais rápido com sua família:

1. Vá em **Authentication → Providers → Email**.
2. Desligue **Confirm email**.

Assim, quem se cadastra já entra direto — bom para os testes iniciais. Você pode
reativar essa confirmação depois, quando quiser deixar o app mais seguro para uso real.

## O que fica de fora nesta primeira versão (por causa do custo)

Para manter o We. 100% gratuito, esta versão usa:

- **Login por email e senha** funcionando de verdade. Os botões de Google, Facebook e
  Apple aparecem na tela (como pede o produto), mas ficam desativados — ativá-los exige
  cadastrar o app nesses provedores, o que pode ser feito depois, se fizer sentido.
- **Busca de endereço gratuita** via OpenStreetMap (sem necessidade de chave paga do
  Google Maps) — funciona igual: a pessoa digita, escolhe o endereço na lista e pode
  abrir a localização no mapa.

Todo o restante do fluxo — cadastro, perfil, criar família, convidar por email, criar
compromisso, verificar conflito de horário, aceitar/recusar presença, notificações,
agenda em Mês/Semana/Dia — funciona de ponta a ponta, com dados reais e compartilhados
entre os membros da família.
