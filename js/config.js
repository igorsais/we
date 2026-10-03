// =========================================================
// We. — Configuração
// =========================================================
// Preencha com os dados do SEU projeto Supabase (gratuito).
// Veja o arquivo LEIA-ME / instruções de configuração para o passo a passo.
window.WE_CONFIG = {
  SUPABASE_URL: "https://yvupomqifxlgdvmwwoem.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable__RqRu7lQ8QR_aAf1dAmCXw_Tz52CyDz",
};

window.WE_SUPABASE_READY = !!(
  window.WE_CONFIG.SUPABASE_URL &&
  window.WE_CONFIG.SUPABASE_URL !== "SUPABASE_URL_AQUI" &&
  window.WE_CONFIG.SUPABASE_ANON_KEY &&
  window.WE_CONFIG.SUPABASE_ANON_KEY !== "SUPABASE_ANON_KEY_AQUI"
);

window.supa = window.WE_SUPABASE_READY
  ? supabase.createClient(window.WE_CONFIG.SUPABASE_URL, window.WE_CONFIG.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

// ---------------------------------------------------------
// Categorias (cor + ícone)
// ---------------------------------------------------------
window.WE_CATEGORIES = {
  trabalho: { label: "Trabalho", color: "#7B1972", icon: "💼" },
  estudo: { label: "Estudo", color: "#5AA9F5", icon: "📚" },
  saude: { label: "Saúde", color: "#E94B9B", icon: "🩺" },
  compras: { label: "Compras", color: "#F47DB5", icon: "🛍️" },
  familia: { label: "Família", color: "#4C1448", icon: "👨‍👩‍👧‍👦" },
  lazer: { label: "Lazer", color: "#8FD3FE", icon: "🎉" },
  casa: { label: "Casa", color: "#A15FA0", icon: "🏠" },
  esporte: { label: "Esporte", color: "#FF7AA8", icon: "⚽" },
  outros: { label: "Outros", color: "#9AA0A6", icon: "✨" },
};

// ---------------------------------------------------------
// Relação familiar
// ---------------------------------------------------------
window.WE_FAMILY_ROLES = [
  "Pai", "Mãe", "Filho", "Filha", "Irmão", "Irmã",
  "Tio", "Tia", "Avô", "Avó", "Primo", "Prima", "Outro",
];

// ---------------------------------------------------------
// Gênero — define o esquema de cores do app pra essa pessoa
// (ver WE.applyGenderTheme em js/utils.js).
// ---------------------------------------------------------
window.WE_GENDER_OPTIONS = ["Feminino", "Masculino", "Prefiro não dizer"];

// ---------------------------------------------------------
// Papéis do participante em um evento
// ---------------------------------------------------------
window.WE_PARTICIPANT_ROLES = [
  { value: "responsavel", label: "Responsável" },
  { value: "acompanhante", label: "Acompanhante" },
  { value: "participante", label: "Participante" },
  { value: "convidado", label: "Convidado" },
];

window.WE_AVATAR_PALETTE = ["#4C1448", "#7B1972", "#E94B9B", "#F47DB5", "#5AA9F5", "#A15FA0"];

// ---------------------------------------------------------
// Cor de avatar por relação familiar (baseado no manual da marca We.)
// ---------------------------------------------------------
window.WE_ROLE_COLORS = {
  "Pai": "#4C1448",
  "Mãe": "#E94B9B",
  "Filho": "#5AA9F5",
  "Filha": "#7B1972",
  "Irmão": "#5AA9F5",
  "Irmã": "#7B1972",
  "Tio": "#7B1972",
  "Tia": "#5AA9F5",
  "Avô": "#4C1448",
  "Avó": "#F47DB5",
  "Primo": "#7B1972",
  "Prima": "#5AA9F5",
  "Outro": "#4C1448",
};

// Idade mínima (em anos) para um participante precisar confirmar presença.
window.WE_CHILD_CONFIRMATION_AGE = 12;

// ---------------------------------------------------------
// Lembretes de compromisso (em minutos antes do início; null = sem lembrete)
// ---------------------------------------------------------
window.WE_REMINDER_OPTIONS = [
  { value: "", label: "Sem lembrete" },
  { value: "10", label: "10 minutos antes" },
  { value: "30", label: "30 minutos antes" },
  { value: "60", label: "1 hora antes" },
  { value: "180", label: "3 horas antes" },
  { value: "1440", label: "1 dia antes" },
  { value: "2880", label: "2 dias antes" },
];

// Chave pública VAPID — usada só para o navegador se inscrever no push.
// A chave privada correspondente vive apenas na function do Supabase (nunca aqui).
window.WE_VAPID_PUBLIC_KEY = "BNXoyxn2SdwAC-uXNLVIJxgwD24Cvo6WVx0PaA03e0DRBlz65eGS9yFcEbTGmebnWZNVUuSgTFGUVGCIESLFYzc";

// Nome (slug) da Edge Function que envia o push real dos lembretes.
// Se você renomear/recriar a function no Supabase com outro nome, troque aqui.
window.WE_PUSH_FUNCTION_NAME = "send-reminder-push";

// Nome (slug) da Edge Function que exclui a conta do próprio usuário.
// Se você renomear/recriar a function no Supabase com outro nome, troque aqui.
window.WE_DELETE_ACCOUNT_FUNCTION_NAME = "delete-account";

// ---------------------------------------------------------
// EmailJS — envio do email de convite direto do navegador (grátis).
// Preencha os 3 valores após criar sua conta em https://www.emailjs.com
// (veja o guia CONFIGURACAO_CONVITES.md). Enquanto estiverem vazios, o
// convite continua sendo criado normalmente, só o email não é enviado.
// ---------------------------------------------------------
window.WE_EMAILJS = {
  PUBLIC_KEY: "IPvUgSMz8wSadpjb0",
  SERVICE_ID: "service_wg6t2vf",
  TEMPLATE_ID: "template_1o0aw59",
};
window.WE_EMAILJS_READY = !!(window.WE_EMAILJS.PUBLIC_KEY && window.WE_EMAILJS.SERVICE_ID && window.WE_EMAILJS.TEMPLATE_ID);
