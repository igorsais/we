// =========================================================
// We. — Bootstrap
// =========================================================
(function boot() {
  if (!window.WE_SUPABASE_READY) {
    const app = document.querySelector("#app");
    app.innerHTML = `
      <div class="we-auth-screen">
        <div class="we-auth-card we-auth-card-wide">
          <div class="we-logo-lg we-center">We<span class="dot">.</span></div>
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

  supa.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      WE.state.profile = null;
      WE.state.family = null;
    }
  });

  WE.router();
})();
