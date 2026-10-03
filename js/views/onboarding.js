// =========================================================
// We. — Perfil inicial, Criar família, Convidar, Aceitar convite
// =========================================================
WE.views = WE.views || {};

const ONBOARD_STEP_HTML = (step, total) => `
  <div class="we-onboard-steps">
    ${Array.from({ length: total }).map((_, i) => `<span class="we-step-dot ${i < step ? "done" : ""} ${i === step - 1 ? "current" : ""}"></span>`).join("")}
  </div>`;

WE.views.profileSetup = () => {
  const app = WE.el("#app");
  const p = WE.state.profile || {};
  app.innerHTML = `
  <div class="we-auth-screen">
    <div class="we-auth-card we-auth-card-wide">
      <img src="assets/logo.png" alt="We." class="we-logo-img we-logo-img-lg we-center-img"/>
      ${ONBOARD_STEP_HTML(1, 3)}
      <h2 class="we-center">Conte um pouco sobre você</h2>
      <p class="we-center we-muted">Essas informações aparecem para sua família.</p>

      <form id="profile-form" class="we-form">
        <div class="we-avatar-picker">
          <div id="avatar-preview">${WE.avatarHtml({ name: p.name || WE.state.session?.user?.email, avatar_url: p.avatar_url }, 72)}</div>
          <label class="we-btn we-btn-ghost we-btn-sm">
            Escolher foto
            <input type="file" id="avatar-input" accept="image/*" hidden/>
          </label>
        </div>
        <label>Nome
          <input type="text" name="name" required value="${WE.escapeHtml(p.name || "")}" placeholder="Seu nome"/>
        </label>
        <label>Telefone <span class="we-optional">(opcional)</span>
          <input type="tel" name="phone" value="${WE.escapeHtml(p.phone || "")}" placeholder="(00) 00000-0000"/>
        </label>
        <label>Data de nascimento
          <input type="date" name="birth_date" required value="${WE.escapeHtml(p.birth_date || "")}" max="${WE.toInputDate(new Date())}"/>
        </label>
        <label>Quem é você na família?
          <select name="family_role" id="family-role-select" required>
            <option value="">Selecione</option>
            ${WE_FAMILY_ROLES.map((r) => `<option value="${r}" ${p.family_role === r ? "selected" : ""}>${r}</option>`).join("")}
          </select>
        </label>
        <label id="custom-role-label" ${p.family_role === "Outro" ? "" : "hidden"}>Como podemos chamar essa relação?
          <input type="text" name="family_role_custom" value="${WE.escapeHtml(p.family_role_custom || "")}" placeholder="Ex: Madrinha"/>
        </label>
        <p class="we-form-error" id="profile-error" hidden></p>
        <button type="submit" class="we-btn we-btn-primary we-btn-block" id="profile-submit">Continuar</button>
      </form>
    </div>
  </div>`;

  let pendingAvatarFile = null;
  WE.el("#avatar-input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    pendingAvatarFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      WE.el("#avatar-preview").innerHTML = `<img src="${reader.result}" class="we-avatar-img" style="width:72px;height:72px"/>`;
    };
    reader.readAsDataURL(file);
  });

  WE.el("#family-role-select").addEventListener("change", (e) => {
    WE.el("#custom-role-label").hidden = e.target.value !== "Outro";
  });

  WE.el("#profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = WE.el("#profile-submit");
    const errEl = WE.el("#profile-error");
    errEl.hidden = true;
    const fd = new FormData(e.target);
    WE.loadingBtn(btn, true, "Salvando...");
    try {
      let avatar_url = p.avatar_url || null;
      if (pendingAvatarFile) {
        avatar_url = await WE.api.uploadAvatar(pendingAvatarFile, WE.state.session.user.id);
      }
      const fields = {
        name: fd.get("name").trim(),
        phone: fd.get("phone").trim(),
        birth_date: fd.get("birth_date") || null,
        family_role: fd.get("family_role"),
        family_role_custom: fd.get("family_role") === "Outro" ? fd.get("family_role_custom").trim() : null,
        avatar_url,
      };
      WE.state.profile = await WE.api.upsertProfile(fields);
      WE.navigate("#/criar-familia");
    } catch (err) {
      errEl.textContent = WE.friendlyError(err);
      errEl.hidden = false;
    } finally {
      WE.loadingBtn(btn, false);
    }
  });
};

WE.views.familySetup = () => {
  const app = WE.el("#app");
  app.innerHTML = `
  <div class="we-auth-screen">
    <div class="we-auth-card">
      <img src="assets/logo.png" alt="We." class="we-logo-img we-logo-img-lg we-center-img"/>
      ${ONBOARD_STEP_HTML(2, 3)}
      <h2 class="we-center">Vamos criar sua família</h2>
      <p class="we-center we-muted">Escolha um nome para identificar sua família no We.</p>
      <form id="family-form" class="we-form">
        <label>Nome da família
          <input type="text" name="family_name" required placeholder="Ex: Família Silva"/>
        </label>
        <p class="we-form-error" id="family-error" hidden></p>
        <button type="submit" class="we-btn we-btn-primary we-btn-block" id="family-submit">Criar família</button>
      </form>
    </div>
  </div>`;

  WE.el("#family-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = WE.el("#family-submit");
    const errEl = WE.el("#family-error");
    errEl.hidden = true;
    const fd = new FormData(e.target);
    WE.loadingBtn(btn, true, "Criando...");
    try {
      WE.state.family = await WE.api.createFamily(fd.get("family_name").trim());
      WE.toast("Família criada!", "success");
      WE.navigate("#/convidar-familia?first=1");
    } catch (err) {
      errEl.textContent = WE.friendlyError(err);
      errEl.hidden = false;
    } finally {
      WE.loadingBtn(btn, false);
    }
  });
};

WE.views.inviteFamily = (params) => {
  const isFirstTime = params.get("first") === "1";
  const app = WE.el("#app");
  const emails = [];
  app.innerHTML = `
  <div class="we-auth-screen">
    <div class="we-auth-card we-auth-card-wide">
      <img src="assets/logo.png" alt="We." class="we-logo-img we-logo-img-lg we-center-img"/>
      ${isFirstTime ? ONBOARD_STEP_HTML(3, 3) : ""}
      <h2 class="we-center">Convide sua família</h2>
      <p class="we-center we-muted">Envie o convite por email. Quem receber poderá criar a conta e entrar direto na família ${WE.escapeHtml(WE.state.family?.name || "")}.</p>

      <form id="invite-add-form" class="we-inline-form">
        <input type="email" id="invite-email-input" placeholder="email@familia.com" />
        <button type="button" class="we-btn we-btn-secondary" id="invite-add-btn">Adicionar</button>
      </form>
      <ul class="we-invite-list" id="invite-list"></ul>
      <p class="we-form-error" id="invite-error" hidden></p>

      <div class="we-form-actions">
        ${isFirstTime ? `<button class="we-btn we-btn-ghost" id="invite-skip">Pular por enquanto</button>` : ""}
        <button class="we-btn we-btn-primary" id="invite-send-btn">Enviar convites</button>
      </div>
    </div>
  </div>`;

  const renderList = () => {
    WE.el("#invite-list").innerHTML = emails
      .map((em, i) => `<li>📧 ${WE.escapeHtml(em)} <button type="button" data-i="${i}" class="we-chip-remove">✕</button></li>`)
      .join("");
    WE.els("#invite-list .we-chip-remove").forEach((btn) =>
      btn.addEventListener("click", () => {
        emails.splice(Number(btn.dataset.i), 1);
        renderList();
      })
    );
  };

  const addEmail = () => {
    const input = WE.el("#invite-email-input");
    const val = input.value.trim().toLowerCase();
    if (val && /\S+@\S+\.\S+/.test(val) && !emails.includes(val)) {
      emails.push(val);
      input.value = "";
      renderList();
    }
  };

  WE.el("#invite-add-btn").addEventListener("click", addEmail);
  WE.el("#invite-email-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addEmail();
    }
  });

  if (isFirstTime) {
    WE.el("#invite-skip").addEventListener("click", () => WE.navigate("#/hoje"));
  }

  WE.el("#invite-send-btn").addEventListener("click", async (e) => {
    const errEl = WE.el("#invite-error");
    errEl.hidden = true;
    if (!emails.length) {
      errEl.textContent = "Adicione ao menos um email para convidar.";
      errEl.hidden = false;
      return;
    }
    WE.loadingBtn(e.target, true, "Enviando...");
    try {
      let anyEmailSent = false;
      let anyEmailFailed = false;
      for (const em of emails) {
        const invitation = await WE.api.createInvitation(WE.state.family.id, em);
        const inviteLink = `${location.origin}${location.pathname}#/convite?token=${invitation.token}`;
        const result = await WE.api.sendInviteEmail({
          toEmail: em,
          familyName: WE.state.family?.name,
          inviterName: WE.state.profile?.name,
          inviteLink,
        });
        if (result.sent) anyEmailSent = true;
        else anyEmailFailed = true;
      }
      if (anyEmailSent && !anyEmailFailed) {
        WE.toast("Convite enviado por email!", "success");
      } else if (anyEmailFailed) {
        WE.toast("Convite criado, mas não foi possível enviar o email agora. Compartilhe o link do We. diretamente.", "info");
      } else {
        WE.toast("Convite criado! Compartilhe o link de acesso do We. com sua família.", "success");
      }
      WE.navigate("#/hoje");
    } catch (err) {
      errEl.textContent = WE.friendlyError(err);
      errEl.hidden = false;
    } finally {
      WE.loadingBtn(e.target, false);
    }
  });
};

WE.views.pendingInviteChoice = (invitations) => {
  const app = WE.el("#app");
  const inv = invitations[0];
  app.innerHTML = `
  <div class="we-auth-screen">
    <div class="we-auth-card">
      <img src="assets/logo.png" alt="We." class="we-logo-img we-logo-img-lg we-center-img"/>
      <h2 class="we-center">Você tem um convite!</h2>
      <p class="we-center we-muted">Você foi convidado para a <strong>${WE.escapeHtml(inv.families?.name || "família")}</strong>.</p>
      <div class="we-form-actions we-form-actions-col">
        <button class="we-btn we-btn-primary we-btn-block" id="accept-invite-btn">Entrar na família</button>
        <button class="we-btn we-btn-ghost we-btn-block" id="create-own-btn">Criar minha própria família</button>
      </div>
    </div>
  </div>`;

  WE.el("#accept-invite-btn").addEventListener("click", async (e) => {
    WE.loadingBtn(e.target, true, "Entrando...");
    try {
      await WE.api.acceptInvitation(inv);
      WE.state.family = await WE.api.getMyFamily();
      WE.toast(`Bem-vindo(a) à ${inv.families?.name}!`, "success");
      WE.navigate("#/hoje");
    } catch (err) {
      WE.toast(WE.friendlyError(err), "error");
      WE.loadingBtn(e.target, false);
    }
  });

  WE.el("#create-own-btn").addEventListener("click", () => WE.navigate("#/criar-familia"));
};

// ---------------------------------------------------------
// Link público de convite (#/convite?token=...)
// ---------------------------------------------------------
WE.views.inviteLanding = async (params) => {
  const token = params.get("token");
  const app = WE.el("#app");
  if (!token) {
    WE.navigate("#/");
    return;
  }
  localStorage.setItem("we_invite_token", token);

  app.innerHTML = `<div class="we-auth-screen"><div class="we-auth-card we-center"><p class="we-muted">Carregando convite...</p></div></div>`;

  let invitation = null;
  try {
    invitation = await WE.api.getInvitationByToken(token);
  } catch (e) {}

  if (!invitation) {
    app.innerHTML = `
    <div class="we-auth-screen"><div class="we-auth-card we-center">
      <img src="assets/logo.png" alt="We." class="we-logo-img"/>
      <h2>Convite não encontrado</h2>
      <p class="we-muted">Esse link pode ter expirado. Peça um novo convite para quem te chamou.</p>
      <a href="#/" class="we-btn we-btn-primary">Voltar ao início</a>
    </div></div>`;
    return;
  }

  app.innerHTML = `
  <div class="we-auth-screen">
    <div class="we-auth-card">
      <img src="assets/logo.png" alt="We." class="we-logo-img we-logo-img-lg we-center-img"/>
      <h2 class="we-center">Você foi convidado!</h2>
      <p class="we-center we-muted">Junte-se à <strong>${WE.escapeHtml(invitation.families?.name || "família")}</strong> no We. — a agenda compartilhada da sua família.</p>
      <div class="we-form-actions we-form-actions-col">
        <a href="#/cadastro" class="we-btn we-btn-primary we-btn-block">Criar minha conta</a>
        <a href="#/entrar" class="we-btn we-btn-ghost we-btn-block">Já tenho conta — Entrar</a>
      </div>
    </div>
  </div>`;
};

// Consumida pelo router após login/perfil: tenta aceitar convite salvo no localStorage
WE.consumePendingInviteToken = async () => {
  const token = localStorage.getItem("we_invite_token");
  if (!token) return null;
  try {
    const invitation = await WE.api.getInvitationByToken(token);
    if (invitation && invitation.status === "pending") {
      await WE.api.acceptInvitation(invitation);
      localStorage.removeItem("we_invite_token");
      return invitation;
    }
    // Resposta definitiva (convite não existe mais ou já foi usado): não há
    // por que guardar esse token, já não serve pra nada.
    localStorage.removeItem("we_invite_token");
    return null;
  } catch (e) {
    // Erro passageiro (rede, etc.) — mantém o token guardado pra tentar de
    // novo na próxima navegação, em vez de perder o convite de vez.
    return null;
  }
};
