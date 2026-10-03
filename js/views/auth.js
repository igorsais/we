// =========================================================
// We. — Landing, Login, Cadastro
// =========================================================
WE.views = WE.views || {};

WE.views.landing = () => {
  const app = WE.el("#app");
  app.innerHTML = `
  <div class="we-landing">
    <header class="we-landing-header">
      <img src="assets/logo.png" alt="We." class="we-logo-img"/>
      <div class="we-landing-header-actions">
        <a href="#/entrar" class="we-btn we-btn-ghost">Entrar</a>
      </div>
    </header>

    <section class="we-hero">
      <img src="assets/logo.png" alt="We." class="we-logo-img we-logo-img-xl we-center-img"/>
      <p class="we-slogan">Planeje, organize e compartilhe</p>
      <h1>A agenda compartilhada da sua família.</h1>
      <p class="we-hero-text">Organize compromissos, combine horários e mantenha todo mundo na mesma página.</p>
      <div class="we-hero-actions">
        <a href="#/cadastro" class="we-btn we-btn-primary we-btn-lg">Criar minha família</a>
        <a href="#/entrar" class="we-btn we-btn-secondary we-btn-lg">Entrar</a>
      </div>
    </section>

    <section class="we-features">
      <div class="we-feature-card">
        <div class="we-feature-icon">🗂️</div>
        <h3>Tudo em um só lugar</h3>
        <p>Compromissos, horários e atividades da família organizados em uma única agenda.</p>
      </div>
      <div class="we-feature-card">
        <div class="we-feature-icon">🤝</div>
        <h3>Feito para compartilhar</h3>
        <p>Convide sua família e compartilhe os compromissos que realmente importam.</p>
      </div>
      <div class="we-feature-card">
        <div class="we-feature-icon">✅</div>
        <h3>Menos conflitos, mais organização</h3>
        <p>O We. verifica a disponibilidade dos participantes antes de você marcar um compromisso.</p>
      </div>
    </section>

    <section class="we-mockup-section">
      <h2>Sua família conectada</h2>
      <div class="we-mockup-card">
        <div class="we-mockup-row"><span class="we-mockup-time">08:00</span> Escola do João <span class="we-badge" style="background:#5AA9F51a;color:#5AA9F5">📚 Estudo</span></div>
        <div class="we-mockup-row"><span class="we-mockup-time">13:00</span> Supermercado <span class="we-badge" style="background:#F47DB51a;color:#F47DB5">🛍️ Compras</span></div>
        <div class="we-mockup-row"><span class="we-mockup-time">16:30</span> Pediatra <span class="we-badge" style="background:#E94B9B1a;color:#E94B9B">🩺 Saúde</span></div>
        <div class="we-mockup-row"><span class="we-mockup-time">19:00</span> Futebol <span class="we-badge" style="background:#FF7AA81a;color:#FF7AA8">⚽ Esporte</span></div>
      </div>
    </section>

    <footer class="we-landing-footer">
      <p>We. — Planeje, organize e compartilhe.</p>
    </footer>
  </div>`;
};

WE.views.login = () => {
  const app = WE.el("#app");
  app.innerHTML = `
  <div class="we-auth-screen">
    <div class="we-auth-card">
      <img src="assets/logo.png" alt="We." class="we-logo-img we-logo-img-lg we-center-img"/>
      <p class="we-slogan we-center">Planeje, organize e compartilhe</p>
      <h2 class="we-center">Que bom te ver de novo</h2>

      <div class="we-social-row">
        <button class="we-btn we-btn-social" disabled title="Em breve">🔵 Continuar com Google</button>
        <button class="we-btn we-btn-social" disabled title="Em breve">🔷 Continuar com Facebook</button>
        <button class="we-btn we-btn-social" disabled title="Em breve"> Continuar com Apple</button>
      </div>
      <div class="we-divider"><span>ou entre com seu email</span></div>

      <form id="login-form" class="we-form">
        <label>Email
          <input type="email" name="email" required placeholder="voce@email.com" autocomplete="email"/>
        </label>
        <label>Senha
          <input type="password" name="password" required placeholder="Sua senha" autocomplete="current-password"/>
        </label>
        <p class="we-form-error" id="login-error" hidden></p>
        <button type="submit" class="we-btn we-btn-primary we-btn-block" id="login-submit">Entrar</button>
      </form>
      <p class="we-auth-switch">Ainda não tem conta? <a href="#/cadastro">Criar minha conta</a></p>
    </div>
  </div>`;

  WE.el("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = WE.el("#login-submit");
    const errEl = WE.el("#login-error");
    errEl.hidden = true;
    const fd = new FormData(e.target);
    WE.loadingBtn(btn, true, "Entrando...");
    try {
      await WE.api.signIn(fd.get("email").trim(), fd.get("password"));
      WE.navigate("#/hoje");
    } catch (err) {
      errEl.textContent = WE.friendlyError(err);
      errEl.hidden = false;
    } finally {
      WE.loadingBtn(btn, false);
    }
  });
};

WE.views.signup = async () => {
  const app = WE.el("#app");
  let inviteEmail = "";
  const inviteToken = localStorage.getItem("we_invite_token");
  if (inviteToken) {
    try {
      const invitation = await WE.api.getInvitationByToken(inviteToken);
      if (invitation && invitation.status === "pending") inviteEmail = invitation.invited_email || "";
    } catch (e) {}
  }
  app.innerHTML = `
  <div class="we-auth-screen">
    <div class="we-auth-card">
      <img src="assets/logo.png" alt="We." class="we-logo-img we-logo-img-lg we-center-img"/>
      <p class="we-slogan we-center">Planeje, organize e compartilhe</p>
      <h2 class="we-center">Vamos criar sua conta</h2>

      <div class="we-social-row">
        <button class="we-btn we-btn-social" disabled title="Em breve">🔵 Continuar com Google</button>
        <button class="we-btn we-btn-social" disabled title="Em breve">🔷 Continuar com Facebook</button>
        <button class="we-btn we-btn-social" disabled title="Em breve"> Continuar com Apple</button>
      </div>
      <div class="we-divider"><span>ou cadastre-se com email</span></div>

      <form id="signup-form" class="we-form">
        <label>Nome
          <input type="text" name="name" required placeholder="Seu nome completo" autocomplete="name"/>
        </label>
        <label>Email
          <input type="email" name="email" required placeholder="voce@email.com" autocomplete="email" value="${WE.escapeHtml(inviteEmail)}" ${inviteEmail ? "readonly" : ""}/>
        </label>
        ${inviteEmail ? `<p class="we-muted we-small">Este é o email que recebeu o convite — use-o para já entrar direto na família.</p>` : ""}
        <label>Senha
          <input type="password" name="password" required minlength="6" placeholder="Mínimo 6 caracteres" autocomplete="new-password"/>
        </label>
        <label>Confirmar senha
          <input type="password" name="password2" required minlength="6" placeholder="Repita a senha" autocomplete="new-password"/>
        </label>
        <p class="we-form-error" id="signup-error" hidden></p>
        <button type="submit" class="we-btn we-btn-primary we-btn-block" id="signup-submit">Criar minha conta</button>
      </form>
      <p class="we-auth-switch">Já tem conta? <a href="#/entrar">Entrar</a></p>
    </div>
  </div>`;

  WE.el("#signup-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = WE.el("#signup-submit");
    const errEl = WE.el("#signup-error");
    errEl.hidden = true;
    const fd = new FormData(e.target);
    const password = fd.get("password");
    const password2 = fd.get("password2");
    if (password !== password2) {
      errEl.textContent = "As senhas não coincidem.";
      errEl.hidden = false;
      return;
    }
    WE.loadingBtn(btn, true, "Criando conta...");
    try {
      const name = fd.get("name").trim();
      const email = fd.get("email").trim();
      const data = await WE.api.signUp(name, email, password);
      if (data.session) {
        await WE.api.upsertProfile({ name, email });
        WE.toast("Conta criada! Vamos montar seu perfil.", "success");
        WE.navigate("#/perfil-inicial");
      } else {
        WE.toast("Verifique seu email para confirmar a conta e depois entre.", "success");
        WE.navigate("#/entrar");
      }
    } catch (err) {
      errEl.textContent = WE.friendlyError(err);
      errEl.hidden = false;
    } finally {
      WE.loadingBtn(btn, false);
    }
  });
};
