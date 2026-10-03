// =========================================================
// We. — Bootstrap
// =========================================================
(function boot() {
  // Se voltou de um link de confirmação de email com um convite embutido
  // (?invite_token=...), guarda o token ANTES de qualquer outra coisa — veja
  // o comentário em WE.api.signUp (js/api.js) sobre por que isso vem na
  // querystring e não depois de um "#". Removemos o parâmetro da URL em
  // seguida só pra não processá-lo de novo a cada hashchange.
  try {
    const url = new URL(location.href);
    const inviteFromQuery = url.searchParams.get("invite_token");
    if (inviteFromQuery) {
      localStorage.setItem("we_invite_token", inviteFromQuery);
      url.searchParams.delete("invite_token");
      history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
  } catch (e) {}

  if (!window.WE_SUPABASE_READY) {
    const app = document.querySelector("#app");
    app.innerHTML = `
      <div class="we-auth-screen">
        <div class="we-auth-card we-auth-card-wide">
          <img src="assets/logo.png" alt="We." class="we-logo-img we-logo-img-lg we-center-img"/>
          <h2 class="we-center">Quase lá!</h2>
          <p class="we-center we-muted">
            O We. precisa se conectar a um banco de dados gratuito (Supabase) para guardar os
            compromissos e perfis da sua família.
          </p>
          <p class="we-center we-muted">Peça para quem configurou este app preencher <code>js/config.js</code> com a URL e a chave do projeto Supabase, seguindo o guia de configuração.</p>
        </div>
      </div>`;
    return;
  }

  if (window.WE_EMAILJS_READY && window.emailjs) {
    emailjs.init({ publicKey: window.WE_EMAILJS.PUBLIC_KEY });
  }

  supa.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      WE.state.profile = null;
      WE.state.family = null;
    }
  });

  WE.router();
})();
