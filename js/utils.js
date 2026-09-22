// =========================================================
// We. — Utilitários
// =========================================================
const WE = (window.WE = window.WE || {});

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

WE.avatarHtml = (profile, size) => {
  size = size || 36;
  const style = `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.38)}px`;
  if (profile?.avatar_url) {
    return `<img src="${profile.avatar_url}" alt="${WE.escapeHtml(profile.name)}" class="we-avatar-img" style="${style}"/>`;
  }
  const color = profile?.avatar_color || WE.colorForId(profile?.id || profile?.name || "?");
  return `<div class="we-avatar" style="${style};background:${color}">${WE.initials(profile?.name)}</div>`;
};

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

WE.friendlyError = (err) => {
  const msg = (err && (err.message || err.error_description)) || "";
  if (/invalid login credentials/i.test(msg)) return "Email ou senha incorretos.";
  if (/already registered|already exists/i.test(msg)) return "Esse email já está cadastrado.";
  if (/password should be at least/i.test(msg)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/rate limit/i.test(msg)) return "Muitas tentativas. Aguarde um momento e tente novamente.";
  if (!msg) return "Algo deu errado. Tente novamente em instantes.";
  return "Algo deu errado. Tente novamente em instantes.";
};
