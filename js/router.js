// =========================================================
// We. — Router + shell
// =========================================================
WE.state = {
  session: null,
  profile: null,
  family: null,
  members: [],
};

const PUBLIC_ROUTES = ["#/", "#/entrar", "#/cadastro", "#/convite"];

WE.navigate = (hash) => {
  if (location.hash === hash) {
    WE.router();
  } else {
    location.hash = hash;
  }
};

WE.requireAuthShell = () => {
  const app = WE.el("#app");
  app.innerHTML = `
    <div class="we-shell">
      <nav class="we-sidebar">
        <div class="we-sidebar-logo"><img src="assets/logo.png" alt="We." class="we-logo-img"/></div>
        <a href="#/hoje" class="we-nav-link" data-route="#/hoje">${WE.icon("home")} <span>Hoje</span></a>
        <a href="#/agenda" class="we-nav-link" data-route="#/agenda">${WE.icon("calendar")} <span>Agenda</span></a>
        <a href="#/novo" class="we-nav-link we-nav-cta" data-route="#/novo">${WE.icon("plus")} <span>Adicionar compromisso</span></a>
        <a href="#/familia" class="we-nav-link" data-route="#/familia">${WE.icon("family")} <span>Família</span></a>
        <a href="#/perfil" class="we-nav-link" data-route="#/perfil">${WE.icon("user")} <span>Perfil</span></a>
        <button class="we-nav-link we-nav-logout" id="btn-logout">${WE.icon("logout")} <span>Sair</span></button>
      </nav>
      <div class="we-main">
        <header class="we-topbar">
          <div class="we-topbar-logo"><img src="assets/logo.png" alt="We." class="we-logo-img we-logo-img-sm"/></div>
          <div class="we-topbar-right">
            <button class="we-icon-btn" id="btn-notifications" aria-label="Notificações">
              ${WE.icon("bell")}<span class="we-badge-dot" id="notif-dot" hidden></span>
            </button>
            <div class="we-topbar-user" id="topbar-user"></div>
          </div>
        </header>
        <main class="we-content" id="we-content"></main>
      </div>
      <nav class="we-bottomnav">
        <a href="#/hoje" data-route="#/hoje">${WE.icon("home")}Hoje</a>
        <a href="#/agenda" data-route="#/agenda">${WE.icon("calendar")}Agenda</a>
        <a href="#/novo" data-route="#/novo" class="we-bottomnav-cta">${WE.icon("plus")}</a>
        <a href="#/familia" data-route="#/familia">${WE.icon("family")}Família</a>
        <a href="#/perfil" data-route="#/perfil">${WE.icon("user")}Perfil</a>
      </nav>
    </div>
  `;
  WE.el("#btn-logout").addEventListener("click", async () => {
    await WE.api.signOut();
    WE.state.profile = null;
    WE.state.family = null;
    WE.navigate("#/");
  });
  WE.el("#btn-notifications").addEventListener("click", WE.views.openNotifications);
  WE.refreshTopbarUser();
  WE.refreshNotifDot();
};

WE.refreshTopbarUser = () => {
  const box = WE.el("#topbar-user");
  if (!box || !WE.state.profile) return;
  box.innerHTML = `${WE.avatarHtml(WE.state.profile, 32)} <span class="we-topbar-name">${WE.escapeHtml(WE.state.profile.name?.split(" ")[0] || "")}</span>`;
};

WE.refreshNotifDot = async () => {
  try {
    const count = await WE.api.unreadNotificationCount();
    const dot = WE.el("#notif-dot");
    if (dot) dot.hidden = count === 0;
  } catch (e) {}
};

WE.setActiveNav = (route) => {
  WE.els(".we-nav-link[data-route], .we-bottomnav a[data-route]").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === route);
  });
};

WE.router = async () => {
  let hash = location.hash || "#/";
  const [path, query] = hash.split("?");

  // Se já está logado, não faz sentido ver landing/login/cadastro — vai direto pro app
  if (path === "#/" || path === "#/entrar" || path === "#/cadastro") {
    const existingSession = await WE.api.getSession();
    if (existingSession) {
      WE.navigate("#/hoje");
      return;
    }
  }

  // Public landing / auth routes
  if (path === "#/") return WE.views.landing();
  if (path === "#/entrar") return WE.views.login();
  if (path === "#/cadastro") return WE.views.signup();
  if (path === "#/convite") return WE.views.inviteLanding(new URLSearchParams(query || ""));

  // Everything below requires a session
  const session = await WE.api.getSession();
  if (!session) {
    WE.navigate("#/entrar");
    return;
  }
  WE.state.session = session;

  if (!WE.state.profile) {
    try {
      WE.state.profile = await WE.api.getMyProfile();
    } catch (e) {}
  }
  WE.applyGenderTheme(WE.state.profile);

  if (path === "#/perfil-inicial") return WE.views.profileSetup();

  if (!WE.state.profile || !WE.state.profile.name || !WE.state.profile.family_role) {
    WE.navigate("#/perfil-inicial");
    return;
  }

  if (path === "#/criar-familia") return WE.views.familySetup();
  if (path === "#/convidar-familia") return WE.views.inviteFamily(new URLSearchParams(query || ""));

  if (!WE.state.family) {
    try {
      WE.state.family = await WE.api.getMyFamily();
    } catch (e) {}
  }

  if (!WE.state.family) {
    // Se veio de um link de convite, tenta entrar automaticamente na família
    if (localStorage.getItem("we_invite_token")) {
      const accepted = await WE.consumePendingInviteToken();
      if (accepted) {
        WE.state.family = await WE.api.getMyFamily();
      }
    }
  }

  if (!WE.state.family) {
    // Checa convites pendentes pelo email antes de pedir para criar uma família
    let pending = [];
    try {
      pending = await WE.api.getMyPendingInvitations();
    } catch (e) {}
    if (pending.length) {
      return WE.views.pendingInviteChoice(pending);
    }
    WE.navigate("#/criar-familia");
    return;
  }

  try {
    WE.state.members = await WE.api.getFamilyMembers(WE.state.family.id);
  } catch (e) {
    WE.state.members = [];
  }

  WE.requireAuthShell();
  WE.setActiveNav(path);
  WE.startReminderLoop();

  const content = WE.el("#we-content");
  try {
    if (path === "#/hoje") await WE.views.dashboard(content);
    else if (path === "#/agenda") await WE.views.agenda(content);
    else if (path === "#/novo") {
      await WE.views.dashboard(content);
      await WE.views.openEventForm();
    } else if (path.startsWith("#/evento/")) {
      await WE.views.dashboard(content);
      await WE.views.openEventDetails(path.split("/")[2]);
    }
    else if (path === "#/familia") await WE.views.familyPage(content);
    else if (path === "#/perfil") await WE.views.profilePage(content);
    else {
      WE.navigate("#/hoje");
    }
  } catch (err) {
    console.error(err);
    content.innerHTML = `<div class="we-empty"><p>Não foi possível carregar esta página agora.</p></div>`;
  }
};

window.addEventListener("hashchange", WE.router);

// ---------------------------------------------------------
// Lembretes: checa periodicamente (e ao carregar) compromissos
// próximos e gera notificações in-app para todos os envolvidos.
// ---------------------------------------------------------
WE.startReminderLoop = () => {
  if (WE._reminderLoopStarted || !WE.state.family) return;
  WE._reminderLoopStarted = true;
  const run = () => {
    WE.api.checkDueReminders(WE.state.family?.id).then(() => WE.refreshNotifDot()).catch(() => {});
  };
  run();
  setInterval(run, 60000);
};
