// =========================================================
// We. — Página Família
// =========================================================
WE.views = WE.views || {};

WE.views.familyPage = async (content) => {
  content.innerHTML = `
    <div class="we-page">
      <div class="we-section-head">
        <h1>Minha família</h1>
        <button class="we-btn we-btn-primary we-btn-sm" id="invite-member-btn">+ Convidar familiar</button>
      </div>
      <p class="we-muted">${WE.escapeHtml(WE.state.family.name)}</p>
      <div id="family-members-list" class="we-family-grid"><div class="we-skeleton we-skeleton-card"></div></div>

      <div class="we-section-head">
        <h2>Convites pendentes</h2>
      </div>
      <div id="family-invites-list" class="we-family-grid"></div>
    </div>
  `;

  WE.el("#invite-member-btn").addEventListener("click", () => {
    WE.navigate("#/convidar-familia");
  });

  try {
    const members = await WE.api.getFamilyMembers(WE.state.family.id);
    WE.el("#family-members-list").innerHTML = members
      .map((m) => {
        const prof = m.profiles;
        return `
        <div class="we-family-card">
          ${WE.avatarHtml(prof, 56)}
          <div class="we-family-card-info">
            <p class="we-family-card-name">${WE.escapeHtml(prof.name)}</p>
            <p class="we-muted we-small">${WE.escapeHtml(prof.family_role_custom || prof.family_role || "")}${m.role === "admin" ? " · Administrador" : ""}</p>
            <p class="we-muted we-small">${WE.escapeHtml(prof.email || "")}</p>
          </div>
          <span class="we-status we-status-ok">✓ Ativo</span>
        </div>`;
      })
      .join("");
  } catch (e) {
    WE.el("#family-members-list").innerHTML = `<p class="we-muted">Não foi possível carregar os membros.</p>`;
  }

  try {
    const invites = await WE.api.getFamilyInvitations(WE.state.family.id);
    const box = WE.el("#family-invites-list");
    if (!invites.length) {
      box.innerHTML = `<p class="we-muted">Nenhum convite pendente.</p>`;
    } else {
      box.innerHTML = invites
        .map(
          (inv) => `
        <div class="we-family-card">
          <div class="we-avatar" style="background:#9AA0A6">✉️</div>
          <div class="we-family-card-info">
            <p class="we-family-card-name">${WE.escapeHtml(inv.invited_email)}</p>
          </div>
          <span class="we-status we-status-pending">⏳ Convite pendente</span>
          <button type="button" class="we-btn we-btn-ghost we-btn-sm" data-resend="${inv.id}" data-email="${WE.escapeHtml(inv.invited_email)}" data-token="${inv.token}">Reenviar email</button>
        </div>`
        )
        .join("");
      WE.els("[data-resend]", box).forEach((btn) =>
        btn.addEventListener("click", async () => {
          WE.loadingBtn(btn, true, "Enviando...");
          const inviteLink = `${location.origin}${location.pathname}#/convite?token=${btn.dataset.token}`;
          const result = await WE.api.sendInviteEmail({
            toEmail: btn.dataset.email,
            familyName: WE.state.family?.name,
            inviterName: WE.state.profile?.name,
            inviteLink,
          });
          WE.loadingBtn(btn, false);
          if (result.sent) WE.toast("Email reenviado!", "success");
          else WE.toast("Não foi possível enviar o email agora. Verifique a configuração do EmailJS.", "error");
        })
      );
    }
  } catch (e) {
    WE.el("#family-invites-list").innerHTML = "";
  }
};
