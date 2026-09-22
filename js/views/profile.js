// =========================================================
// We. — Página Perfil + Notificações
// =========================================================
WE.views = WE.views || {};

WE.views.profilePage = async (content) => {
  const p = WE.state.profile;
  content.innerHTML = `
    <div class="we-page we-page-narrow">
      <h1>Meu perfil</h1>
      <div class="we-card we-profile-card">
        <div class="we-avatar-picker">
          <div id="profile-avatar-preview">${WE.avatarHtml(p, 80)}</div>
          <label class="we-btn we-btn-ghost we-btn-sm">
            Alterar foto
            <input type="file" id="profile-avatar-input" accept="image/*" hidden/>
          </label>
        </div>
        <form id="profile-edit-form" class="we-form">
          <label>Nome
            <input type="text" name="name" required value="${WE.escapeHtml(p.name || "")}"/>
          </label>
          <label>Email
            <input type="email" value="${WE.escapeHtml(p.email || "")}" disabled/>
          </label>
          <label>Telefone
            <input type="tel" name="phone" value="${WE.escapeHtml(p.phone || "")}"/>
          </label>
          <label>Data de nascimento
            <input type="date" name="birth_date" value="${WE.escapeHtml(p.birth_date || "")}" max="${WE.toInputDate(new Date())}"/>
          </label>
          <label>Quem é você na família?
            <select name="family_role" id="edit-family-role">
              ${WE_FAMILY_ROLES.map((r) => `<option value="${r}" ${p.family_role === r ? "selected" : ""}>${r}</option>`).join("")}
            </select>
          </label>
          <label id="edit-custom-role-label" ${p.family_role === "Outro" ? "" : "hidden"}>Relação personalizada
            <input type="text" name="family_role_custom" value="${WE.escapeHtml(p.family_role_custom || "")}"/>
          </label>
          <p class="we-form-error" id="profile-edit-error" hidden></p>
          <button type="submit" class="we-btn we-btn-primary" id="profile-edit-submit">Salvar alterações</button>
        </form>
      </div>

      <div class="we-card">
        <h3>Segurança</h3>
        <form id="password-form" class="we-form">
          <label>Nova senha
            <input type="password" name="password" minlength="6" placeholder="Mínimo 6 caracteres"/>
          </label>
          <p class="we-form-error" id="password-error" hidden></p>
          <button type="submit" class="we-btn we-btn-secondary">Alterar senha</button>
        </form>
        <button class="we-btn we-btn-danger-outline" id="signout-btn" style="margin-top:12px">Sair da conta</button>
      </div>

      <div class="we-card">
        <h3>${WE.icon("bell", "we-icon-inline")} Notificações push</h3>
        <p class="we-muted we-small">Receba um aviso no seu celular ou computador quando um compromisso estiver próximo — mesmo com o We. fechado.</p>
        <p id="push-status" class="we-muted we-small"></p>
        <button class="we-btn we-btn-secondary" id="push-toggle-btn">Ativar notificações push</button>
      </div>
    </div>
  `;

  let pendingFile = null;
  WE.el("#profile-avatar-input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    pendingFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      WE.el("#profile-avatar-preview").innerHTML = `<img src="${reader.result}" class="we-avatar-img" style="width:80px;height:80px"/>`;
    };
    reader.readAsDataURL(file);
  });

  WE.el("#edit-family-role").addEventListener("change", (e) => {
    WE.el("#edit-custom-role-label").hidden = e.target.value !== "Outro";
  });

  WE.el("#profile-edit-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = WE.el("#profile-edit-submit");
    const errEl = WE.el("#profile-edit-error");
    errEl.hidden = true;
    const fd = new FormData(e.target);
    WE.loadingBtn(btn, true, "Salvando...");
    try {
      let avatar_url = p.avatar_url;
      if (pendingFile) avatar_url = await WE.api.uploadAvatar(pendingFile, WE.state.session.user.id);
      WE.state.profile = await WE.api.upsertProfile({
        name: fd.get("name").trim(),
        phone: fd.get("phone").trim(),
        birth_date: fd.get("birth_date") || null,
        family_role: fd.get("family_role"),
        family_role_custom: fd.get("family_role") === "Outro" ? fd.get("family_role_custom").trim() : null,
        avatar_url,
      });
      WE.refreshTopbarUser();
      WE.toast("Perfil atualizado!", "success");
    } catch (err) {
      errEl.textContent = WE.friendlyError(err);
      errEl.hidden = false;
    } finally {
      WE.loadingBtn(btn, false);
    }
  });

  WE.el("#password-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = WE.el("#password-error");
    errEl.hidden = true;
    const fd = new FormData(e.target);
    const pwd = fd.get("password");
    if (!pwd || pwd.length < 6) {
      errEl.textContent = "A senha precisa ter pelo menos 6 caracteres.";
      errEl.hidden = false;
      return;
    }
    try {
      await WE.api.updatePassword(pwd);
      WE.toast("Senha alterada!", "success");
      e.target.reset();
    } catch (err) {
      errEl.textContent = WE.friendlyError(err);
      errEl.hidden = false;
    }
  });

  WE.el("#signout-btn").addEventListener("click", async () => {
    await WE.api.signOut();
    WE.state.profile = null;
    WE.state.family = null;
    WE.navigate("#/");
  });

  await refreshPushUi();
};

async function refreshPushUi() {
  const statusEl = WE.el("#push-status");
  const btn = WE.el("#push-toggle-btn");
  if (!statusEl || !btn) return;
  if (!WE.pushSupported()) {
    statusEl.textContent = "Este navegador não é compatível com notificações push. No iPhone, adicione o We. à Tela de Início (compartilhar → Adicionar à Tela de Início) e abra por lá.";
    btn.hidden = true;
    return;
  }
  const state = await WE.getPushSubscriptionState();
  if (state === "denied") {
    statusEl.textContent = "As notificações foram bloqueadas neste navegador. Habilite-as nas configurações do site para ativar.";
    btn.hidden = true;
    return;
  }
  btn.hidden = false;
  if (state === "subscribed") {
    statusEl.textContent = "Notificações push ativadas neste dispositivo.";
    btn.textContent = "Desativar notificações push";
    btn.onclick = async () => {
      WE.loadingBtn(btn, true, "Desativando...");
      try {
        await WE.disablePushNotifications();
        WE.toast("Notificações push desativadas.", "success");
      } catch (e) {
        WE.toast(WE.friendlyError(e), "error");
      } finally {
        WE.loadingBtn(btn, false);
        refreshPushUi();
      }
    };
  } else {
    statusEl.textContent = "Notificações push desativadas neste dispositivo.";
    btn.textContent = "Ativar notificações push";
    btn.onclick = async () => {
      WE.loadingBtn(btn, true, "Ativando...");
      try {
        await WE.enablePushNotifications();
        WE.toast("Notificações push ativadas!", "success");
      } catch (e) {
        WE.toast(WE.friendlyError(e), "error");
      } finally {
        WE.loadingBtn(btn, false);
        refreshPushUi();
      }
    };
  }
}

// ---------------------------------------------------------
// Notificações
// ---------------------------------------------------------
WE.views.openNotifications = async () => {
  WE.openModal(`<div class="we-modal-body we-center"><p class="we-muted">Carregando...</p></div>`);
  let notifs = [];
  try {
    notifs = await WE.api.getNotifications();
  } catch (e) {}

  const html = `
    <div class="we-modal-head">
      <h3>Notificações</h3>
      <button type="button" class="we-icon-btn" id="notif-close">${WE.icon("close")}</button>
    </div>
    <div class="we-modal-body">
      ${notifs.length ? `<button class="we-link-more" id="mark-all-read">Marcar tudo como lido</button>` : ""}
      <div class="we-notif-list">
        ${
          notifs.length
            ? notifs
                .map(
                  (n) => `
          <div class="we-notif-item ${n.read ? "" : "unread"}" data-id="${n.id}" ${n.event_id ? `data-event-id="${n.event_id}"` : ""}>
            <span class="we-notif-icon">${notifIcon(n.type)}</span>
            <div>
              <p>${WE.escapeHtml(n.message)}</p>
              <p class="we-muted we-small">${new Date(n.created_at).toLocaleString("pt-BR")}</p>
            </div>
          </div>`
                )
                .join("")
            : `<p class="we-muted we-center">Nenhuma notificação por aqui.</p>`
        }
      </div>
    </div>
  `;
  WE.openModal(html, { wide: true });
  WE.el("#notif-close").addEventListener("click", WE.closeModal);
  if (WE.el("#mark-all-read")) {
    WE.el("#mark-all-read").addEventListener("click", async () => {
      await WE.api.markAllNotificationsRead();
      WE.refreshNotifDot();
      WE.views.openNotifications();
    });
  }
  WE.els(".we-notif-item").forEach((item) =>
    item.addEventListener("click", async () => {
      await WE.api.markNotificationRead(item.dataset.id);
      WE.refreshNotifDot();
      if (item.dataset.eventId) {
        WE.closeModal();
        WE.navigate(`#/evento/${item.dataset.eventId}`);
      }
    })
  );
};

function notifIcon(type) {
  return (
    {
      new_event: "📅",
      event_updated: "✏️",
      event_cancelled: "🚫",
      participant_accepted: "✅",
      participant_declined: "❌",
      invite: "✉️",
      reminder: "⏰",
    }[type] || "🔔"
  );
}
