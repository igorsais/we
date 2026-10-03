# We. — Configurando lembretes e notificações push

Esta atualização adiciona:
- Um campo **"Lembrete"** ao criar/editar um compromisso (ex: "30 minutos antes", "1 dia antes").
- Notificações **dentro do app** (sino no topo) quando o lembrete vence.
- Notificações **push reais** no celular/computador — funcionam mesmo com o We. fechado (exceto iPhone, veja nota abaixo).

As notificações in-app já funcionam automaticamente, sem nenhuma configuração — basta rodar a migração do banco (passo 1). Os passos 2 a 5 são só para habilitar o **push real**.

## 1. Atualize o banco de dados (obrigatório)

No painel do Supabase → **SQL Editor** → cole e rode o conteúdo do arquivo `sql/migration_reminders.sql`.

Isso adiciona a coluna de lembrete nos compromissos e cria as tabelas necessárias para push. Não apaga nada que já existe.

## 2. Publique a Edge Function (só para push real)

1. No painel do Supabase, vá em **Edge Functions** → **Deploy a new function** (ou **Open Editor**, no card "Via Editor").
2. No campo de nome/slug da function, digite exatamente `send-reminder-push` (só letras, números, `-` e `_`; sem espaços, acentos ou extensão como `.ts`).
3. Apague o conteúdo padrão e cole todo o conteúdo do arquivo `supabase-function/send-reminder-push.ts`.
4. Clique em **Deploy**.

Detalhe importante: o campo "Name" na aba **Settings** da function é só um rótulo visual — ele mesmo avisa que "seu slug e a URL do endpoint permanecem os mesmos". Ou seja, se precisar mudar o nome de verdade, é preciso criar a function de novo com o nome certo desde o início (não dá para renomear depois de criada).

## 3. Cadastre os secrets da function

Ainda em Edge Functions (ou em **Project Settings → Edge Functions → Secrets**), adicione:

| Nome | Valor |
|---|---|
| `VAPID_PUBLIC_KEY` | `BNXoyxn2SdwAC-uXNLVIJxgwD24Cvo6WVx0PaA03e0DRBlz65eGS9yFcEbTGmebnWZNVUuSgTFGUVGCIESLFYzc` |
| `VAPID_PRIVATE_KEY` | *(chave privada — enviada separadamente no chat, nunca a coloque em nenhum arquivo do site)* |
| `VAPID_SUBJECT` | `mailto:seuemail@exemplo.com` (um email de contato seu) |

⚠️ **A chave privada nunca deve entrar em nenhum arquivo do site (index.html, js/config.js etc).** Ela fica só aqui, como secret da function.

## 4. Agende o envio automático (pg_cron)

No **SQL Editor**, abra o arquivo `sql/migration_pg_cron_push.sql`, substitua:
- `SEU_PROJETO` pela referência do seu projeto (a mesma que aparece na SUPABASE_URL, ex: `yvupomqifxlgdvmwwoem`)
- `SUA_SERVICE_ROLE_KEY` pela sua **service role key** (Project Settings → API → `service_role` — é diferente da chave publishable que está no site; essa aqui é secreta, só usada dentro do próprio Supabase)

O arquivo já está apontando para `.../functions/v1/send-reminder-push`. Se você recriar a function com outro nome no futuro, troque esse trecho da URL (e também `WE_PUSH_FUNCTION_NAME` em `js/config.js`).

Depois rode o script. Isso faz o Supabase chamar a Edge Function a cada minuto, verificando lembretes vencidos e enviando push para quem tiver ativado.

## 5. Ative nas configurações de cada pessoa

No app, cada pessoa da família que quiser receber push deve ir em **Perfil → Notificações push → Ativar notificações push** e aceitar a permissão do navegador. Isso é por dispositivo (ativar no celular é separado de ativar no computador).

### 📱 No iPhone/iPad

O Safari só entrega push para o We. se ele estiver "instalado" como um app:
1. Abra o We. no Safari.
2. Toque em **Compartilhar** → **Adicionar à Tela de Início**.
3. Abra o We. a partir do ícone criado na tela de início (não pelo Safari).
4. Vá em Perfil e ative as notificações push por lá.

No Android e no computador (Chrome/Edge/Firefox) não precisa desse passo — o botão "Ativar notificações push" já funciona direto no navegador.

## Resumo do que cada arquivo faz

| Arquivo | Para quê |
|---|---|
| `sql/migration_reminders.sql` | Cria a coluna de lembrete e as tabelas de push |
| `sql/migration_pg_cron_push.sql` | Agenda a checagem automática a cada minuto |
| `supabase-function/send-reminder-push.ts` | Código da Edge Function que envia o push |
| `sw.js` (raiz do site) | Service worker — recebe o push no navegador |
| `manifest.json` (raiz do site) | Permite "instalar" o We. como app (necessário no iPhone) |
