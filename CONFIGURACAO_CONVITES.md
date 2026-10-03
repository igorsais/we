# We. — Configurando o email de convite (EmailJS, grátis)

Antes desta correção, convidar alguém só criava um registro no banco — nenhum
email era enviado de verdade. Agora o app envia o email do convite direto do
navegador, usando o **EmailJS** (gratuito até 200 emails/mês, mais que suficiente
para convidar familiares).

Enquanto os passos abaixo não forem feitos, os convites continuam sendo criados
normalmente (e aparecem em "Convites pendentes" com um botão "Reenviar email" para
tentar de novo depois) — só o envio automático do email fica pendente.

## 1. Criar conta gratuita no EmailJS

1. Acesse https://www.emailjs.com e crie uma conta gratuita.
2. No painel, vá em **Email Services** → **Add New Service**.
3. Escolha o provedor do seu email (Gmail, Outlook, etc.) e siga a autorização
   (é o mesmo tipo de tela de login que aparece quando você conecta o Gmail a
   qualquer app). Ao final, anote o **Service ID** (algo como `service_abc1234`).

## 2. Criar o template do email

1. Vá em **Email Templates** → **Create New Template**.
2. Monte o email como preferir. Use estas variáveis no corpo do template (elas
   serão substituídas automaticamente pelo app):
   - `{{to_email}}` — email de quem está sendo convidado (coloque também no
     campo "To email" das configurações do template, na aba **Settings**)
   - `{{inviter_name}}` — nome de quem convidou
   - `{{family_name}}` — nome da família
   - `{{invite_link}}` — link para entrar direto no convite

   Sugestão de corpo:
   ```
   Assunto: {{inviter_name}} te convidou para a família {{family_name}} no We.

   Olá!

   {{inviter_name}} te convidou para fazer parte da agenda compartilhada da
   família {{family_name}} no We.

   Clique no link abaixo para aceitar o convite e criar sua conta:
   {{invite_link}}

   — We., a agenda da sua família
   ```
3. Salve e anote o **Template ID** (algo como `template_xyz789`).

## 3. Pegar sua chave pública

Vá em **Account → General** e copie a **Public Key**.

## 4. Preencher no site

Abra `js/config.js` e preencha:

```js
window.WE_EMAILJS = {
  PUBLIC_KEY: "cole_aqui_sua_public_key",
  SERVICE_ID: "cole_aqui_seu_service_id",
  TEMPLATE_ID: "cole_aqui_seu_template_id",
};
```

Suba o zip atualizado no GitHub Pages (como sempre) e pronto — a partir daí,
convidar alguém pela tela "Convidar família" já dispara o email de verdade, e
qualquer convite pendente pode ser reenviado a qualquer momento na página Família.

## Limites do plano grátis

200 emails/mês, o que é bem mais do que uma família costuma precisar. Se algum
dia passar disso, o EmailJS avisa e você pode migrar para um plano pago ou trocar
o provedor depois — nada no restante do app depende disso.
