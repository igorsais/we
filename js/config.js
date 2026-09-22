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
// Papéis do participante em um evento
// ---------------------------------------------------------
window.WE_PARTICIPANT_ROLES = [
  { value: "responsavel", label: "Responsável" },
  { value: "acompanhante", label: "Acompanhante" },
  { value: "participante", label: "Participante" },
  { value: "convidado", label: "Convidado" },
];

window.WE_AVATAR_PALETTE = ["#4C1448", "#7B1972", "#E94B9B", "#F47DB5", "#5AA9F5", "#A15FA0"];
