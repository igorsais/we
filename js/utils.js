// =========================================================
// We. — Utilitários
// =========================================================
const WE = (window.WE = window.WE || {});

// Troca o esquema de cores do app (rosa/vinho ou azul) de acordo com o
// gênero salvo no perfil da pessoa logada. Chamado sempre que o perfil é
// carregado ou salvo (router.js, onboarding.js, profile.js). Ver o bloco
// [data-theme="masculino"] em css/style.css.
WE.applyGenderTheme = (profile) => {
  const theme = profile?.gender === "Masculino" ? "masculino" : "feminino";
  document.documentElement.setAttribute("data-theme", theme);
};

WE.el = (sel, root) => (root || document).querySelector(sel);
WE.els = (sel, root) => Array.from((root || document).querySelectorAll(sel));

WE.escapeHtml = (str) =>
  String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

WE.initials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
};

WE.colorForId = (id) => {
  if (!id) return WE_AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return WE_AVATAR_PALETTE[Math.abs(hash) % WE_AVATAR_PALETTE.length];
};

WE.roleColor = (profile) => {
  const role = profile?.family_role;
  if (role && WE_ROLE_COLORS[role]) return WE_ROLE_COLORS[role];
  return null;
};

WE.avatarHtml = (profile, size) => {
  size = size || 36;
  const style = `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.38)}px`;
  if (profile?.avatar_url) {
    return `<img src="${profile.avatar_url}" alt="${WE.escapeHtml(profile.name)}" class="we-avatar-img" style="${style}"/>`;
  }
  const color = profile?.avatar_color || WE.roleColor(profile) || WE.colorForId(profile?.id || profile?.name || "?");
  return `<div class="we-avatar" style="${style};background:${color}">${WE.initials(profile?.name)}</div>`;
};

// ---------------------------------------------------------
// Idade / confirmação infantil
// ---------------------------------------------------------
WE.ageFromBirthdate = (birthDate) => {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (isNaN(b)) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const monthDiff = now.getMonth() - b.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < b.getDate())) age--;
  return age;
};

WE.isChildParticipant = (profile) => {
  const age = WE.ageFromBirthdate(profile?.birth_date);
  return age !== null && age < WE_CHILD_CONFIRMATION_AGE;
};

// Metadados de status de participação para exibir em cards/detalhes.
// creatorId = id de quem criou o compromisso.
WE.participantStatusMeta = (participant, creatorId) => {
  const profile = participant?.profiles || {};
  if (profile.id === creatorId) {
    return { icon: "✓", text: "Você criou este compromisso", textOther: `${(profile.name || "").split(" ")[0]} criou este compromisso`, cls: "we-status-ok" };
  }
  if (WE.isChildParticipant(profile)) {
    return { icon: "👶", text: "Participando", textOther: "Participando", cls: "we-status-child" };
  }
  if (participant.response_status === "accepted") {
    return { icon: "✓", text: "Você confirmou", textOther: "Confirmou presença", cls: "we-status-ok" };
  }
  if (participant.response_status === "declined") {
    return { icon: "✕", text: "Você recusou", textOther: "Recusou", cls: "we-status-declined" };
  }
  return { icon: "⏳", text: "Aguardando sua confirmação", textOther: "Aguardando confirmação", cls: "we-status-pending" };
};

// ---------------------------------------------------------
// Ícones (SVG lineares, cor via currentColor)
// ---------------------------------------------------------
WE.ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  family: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8.5" cy="7.5" r="2.6"/><circle cx="17" cy="8.5" r="2.2"/><path d="M3 20v-1.6c0-2.1 2.5-3.4 5.5-3.4s5.5 1.3 5.5 3.4V20"/><path d="M14 15.2c2.6.1 4.8 1.3 4.8 3.1V20"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M4.5 20v-.8c0-2.6 3.4-4.2 7.5-4.2s7.5 1.6 7.5 4.2v.8"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 20H5.5a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 5.5 4H9"/><path d="M16 16.5 20.5 12 16 7.5"/><path d="M20.5 12H9.5"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10.5a6 6 0 1 1 12 0c0 3 1 4.6 1.6 5.4a1 1 0 0 1-.8 1.6H5.2a1 1 0 0 1-.8-1.6C5 15.1 6 13.5 6 10.5Z"/><path d="M9.5 19a2.5 2.5 0 0 0 5 0"/></svg>',
  chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.4"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
};
WE.icon = (name, cls) => `<span class="we-icon ${cls || ""}">${WE.ICONS[name] || ""}</span>`;

WE.categoryBadge = (cat) => {
  const c = WE_CATEGORIES[cat] || WE_CATEGORIES.outros;
  return `<span class="we-badge" style="background:${c.color}1a;color:${c.color}"><span>${c.icon}</span>${c.label}</span>`;
};

const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAYS_LONG = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

WE.fmtTime = (d) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
WE.fmtDateShort = (d) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
WE.fmtDateLong = (d) => `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
WE.weekdayShort = (d) => WEEKDAYS_SHORT[d.getDay()];
WE.monthLabel = (d) => `${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
WE.sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
WE.startOfWeek = (d) => { const n = new Date(d); n.setDate(n.getDate() - n.getDay()); n.setHours(0, 0, 0, 0); return n; };
WE.addDays = (d, n) => { const c = new Date(d); c.setDate(c.getDate() + n); return c; };
WE.toInputDate = (d) => { const pad = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

WE.greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
};

// ---------------------------------------------------------
// Toast
// ---------------------------------------------------------
WE.toast = (msg, type) => {
  const wrap = WE.el("#we-toasts");
  if (!wrap) return;
  const div = document.createElement("div");
  div.className = `we-toast we-toast-${type || "info"}`;
  div.textContent = msg;
  wrap.appendChild(div);
  requestAnimationFrame(() => div.classList.add("show"));
  setTimeout(() => {
    div.classList.remove("show");
    setTimeout(() => div.remove(), 300);
  }, 3200);
};

// ---------------------------------------------------------
// Modal helper
// ---------------------------------------------------------
WE.openModal = (innerHtml, opts) => {
  opts = opts || {};
  const root = WE.el("#we-modal-root");
  root.innerHTML = `
    <div class="we-modal-backdrop" id="we-modal-backdrop">
      <div class="we-modal ${opts.wide ? "we-modal-wide" : ""}" role="dialog" aria-modal="true">${innerHtml}</div>
    </div>`;
  root.classList.add("open");
  const backdrop = WE.el("#we-modal-backdrop");
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop && !opts.persistent) WE.closeModal();
  });
  return root;
};
WE.closeModal = () => {
  const root = WE.el("#we-modal-root");
  root.classList.remove("open");
  root.innerHTML = "";
};

WE.loadingBtn = (btn, isLoading, labelWhenLoading) => {
  if (!btn) return;
  if (isLoading) {
    btn.dataset.originalLabel = btn.innerHTML;
    btn.innerHTML = `<span class="we-spinner"></span> ${labelWhenLoading || "Enviando..."}`;
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.originalLabel || btn.innerHTML;
    btn.disabled = false;
  }
};

WE.debounce = (fn, wait) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

// ---------------------------------------------------------
// Lembretes
// ---------------------------------------------------------
WE.reminderLabel = (minutes) => {
  const found = (window.WE_REMINDER_OPTIONS || []).find((o) => Number(o.value) === Number(minutes));
  if (found) return found.label.replace(/ antes$/, "");
  if (minutes >= 1440) return `${Math.round(minutes / 1440)} dia(s)`;
  if (minutes >= 60) return `${Math.round(minutes / 60)} hora(s)`;
  return `${minutes} minuto(s)`;
};

// ---------------------------------------------------------
// Push notifications (Web Push via VAPID)
// ---------------------------------------------------------
WE.urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
};

WE.pushSupported = () =>
  "serviceWorker" in navigator && "PushManager" in window && !!window.WE_VAPID_PUBLIC_KEY;

WE.getPushSubscriptionState = async () => {
  if (!WE.pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && (await reg.pushManager.getSubscription());
    return sub ? "subscribed" : "not-subscribed";
  } catch (e) {
    return "not-subscribed";
  }
};

WE.enablePushNotifications = async () => {
  if (!WE.pushSupported()) throw new Error("Notificações push não são suportadas neste navegador.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Permissão de notificação não concedida.");
  const reg = await navigator.serviceWorker.register("sw.js");
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: WE.urlBase64ToUint8Array(window.WE_VAPID_PUBLIC_KEY),
    });
  }
  await WE.api.savePushSubscription(sub);
  return sub;
};

WE.disablePushNotifications = async () => {
  if (!WE.pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await WE.api.deletePushSubscription(sub.endpoint);
    await sub.unsubscribe();
  }
};

WE.friendlyError = (err) => {
  const msg = (err && (err.message || err.error_description)) || "";
  if (/invalid login credentials/i.test(msg)) return "Email ou senha incorretos.";
  if (/already registered|already exists/i.test(msg)) return "Esse email já está cadastrado.";
  if (/password should be at least/i.test(msg)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/rate limit/i.test(msg)) return "Muitas tentativas. Aguarde um momento e tente novamente.";
  if (!msg) return "Algo deu errado. Tente novamente em instantes.";
  return "Algo deu errado. Tente novamente em instantes.";
};
