// =========================================================
// We. — Dashboard (Hoje) + Agenda (Mês/Semana/Dia)
// =========================================================
WE.views = WE.views || {};

function participantChipsHtml(participants, meId) {
  return participants
    .map((p) => {
      const prof = p.profiles || {};
      const mine = prof.id === meId;
      return `<div class="we-participant-chip" title="${WE.escapeHtml(prof.name)} — ${WE_PARTICIPANT_ROLES.find(r=>r.value===p.role)?.label||p.role}">
        ${WE.avatarHtml(prof, 24)}
        <span>${WE.escapeHtml(mine ? "Você" : prof.name?.split(" ")[0])}</span>
      </div>`;
    })
    .join("");
}

function statusLabel(participants, meId) {
  const me = participants.find((p) => p.profiles?.id === meId);
  if (!me) return "";
  if (me.response_status === "accepted") return `<span class="we-status we-status-ok">✓ Você confirmou</span>`;
  if (me.response_status === "declined") return `<span class="we-status we-status-declined">✕ Você recusou</span>`;
  return `<span class="we-status we-status-pending">Aguardando sua confirmação</span>`;
}

function eventCardHtml(ev, meId) {
  const start = new Date(ev.start_datetime);
  const end = new Date(ev.end_datetime);
  const cat = WE_CATEGORIES[ev.category] || WE_CATEGORIES.outros;
  const timeLabel = ev.all_day ? "Dia inteiro" : `${WE.fmtTime(start)} — ${WE.fmtTime(end)}`;
  return `
  <div class="we-event-card" data-event-id="${ev.id}" style="border-left-color:${cat.color}">
    <div class="we-event-card-top">
      <span class="we-event-time">${timeLabel}</span>
      ${WE.categoryBadge(ev.category)}
    </div>
    <h4 class="we-event-title">${WE.escapeHtml(ev.title)}</h4>
    ${ev.location ? `<p class="we-event-location">📍 ${WE.escapeHtml(ev.location)}</p>` : ""}
    <div class="we-event-participants">${participantChipsHtml(ev.event_participants || [], meId)}</div>
    <div class="we-event-footer">${statusLabel(ev.event_participants || [], meId)}</div>
  </div>`;
}

WE.views.dashboard = async (content) => {
  const meId = WE.state.session.user.id;
  const now = new Date();
  content.innerHTML = `
    <div class="we-page">
      <h1 class="we-greeting">${WE.greeting()}, ${WE.escapeHtml(WE.state.profile.name.split(" ")[0])}!</h1>
      <p class="we-subgreeting">${WE.fmtDateLong(now)}</p>

      <div class="we-section-head">
        <h2>Hoje</h2>
        <a href="#/novo" class="we-btn we-btn-primary we-btn-sm">+ Adicionar compromisso</a>
      </div>
      <div id="today-events" class="we-events-list"><div class="we-skeleton-list">${skeletonCards(2)}</div></div>

      <div class="we-section-head">
        <h2>Nossa semana</h2>
        <a href="#/agenda" class="we-link-more">Ver agenda completa →</a>
      </div>
      <div id="week-strip" class="we-week-strip"><div class="we-skeleton-list">${skeletonCards(1)}</div></div>
    </div>
  `;

  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(startToday);
  endToday.setDate(endToday.getDate() + 1);

  try {
    const todayEvents = await WE.api.getEventsInRange(WE.state.family.id, startToday.toISOString(), endToday.toISOString());
    const box = WE.el("#today-events");
    if (!todayEvents.length) {
      box.innerHTML = `<div class="we-empty"><p class="we-empty-emoji">🌤️</p><p>Sua agenda está tranquila.</p><p class="we-muted">Nenhum compromisso para hoje.</p><a href="#/novo" class="we-btn we-btn-primary">+ Adicionar compromisso</a></div>`;
    } else {
      box.innerHTML = todayEvents.map((ev) => eventCardHtml(ev, meId)).join("");
      bindEventCardClicks(box);
    }
  } catch (e) {
    WE.el("#today-events").innerHTML = `<div class="we-empty"><p>Não foi possível carregar os compromissos de hoje.</p></div>`;
  }

  try {
    const weekStart = WE.startOfWeek(now);
    const weekEnd = WE.addDays(weekStart, 7);
    const weekEvents = await WE.api.getEventsInRange(WE.state.family.id, weekStart.toISOString(), weekEnd.toISOString());
    const strip = WE.el("#week-strip");
    strip.innerHTML = Array.from({ length: 7 })
      .map((_, i) => {
        const day = WE.addDays(weekStart, i);
        const dayEvents = weekEvents
          .filter((ev) => WE.sameDay(new Date(ev.start_datetime), day))
          .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
        return `
        <div class="we-week-day ${WE.sameDay(day, now) ? "is-today" : ""}">
          <div class="we-week-day-head">${WE.weekdayShort(day)} <span>${day.getDate()}</span></div>
          <div class="we-week-day-events">
            ${dayEvents.length ? dayEvents.map((ev) => `<div class="we-week-event-dot" style="background:${(WE_CATEGORIES[ev.category]||WE_CATEGORIES.outros).color}" title="${WE.escapeHtml(ev.title)}"><span>${WE.fmtTime(new Date(ev.start_datetime))}</span> ${WE.escapeHtml(ev.title)}</div>`).join("") : `<div class="we-week-day-empty">—</div>`}
          </div>
        </div>`;
      })
      .join("");
  } catch (e) {
    WE.el("#week-strip").innerHTML = "";
  }
};

function skeletonCards(n) {
  return Array.from({ length: n }).map(() => `<div class="we-skeleton we-skeleton-card"></div>`).join("");
}

function bindEventCardClicks(container) {
  WE.els(".we-event-card", container).forEach((card) => {
    card.addEventListener("click", () => WE.navigate(`#/evento/${card.dataset.eventId}`));
  });
}

// ---------------------------------------------------------
// AGENDA (Mês / Semana / Dia)
// ---------------------------------------------------------
WE.agendaState = { view: "month", cursor: new Date() };

WE.views.agenda = async (content) => {
  const st = WE.agendaState;
  content.innerHTML = `
    <div class="we-page">
      <div class="we-agenda-head">
        <h1>Agenda</h1>
        <div class="we-agenda-controls">
          <div class="we-segmented" id="agenda-view-toggle">
            <button data-view="month" class="${st.view === "month" ? "active" : ""}">Mês</button>
            <button data-view="week" class="${st.view === "week" ? "active" : ""}">Semana</button>
            <button data-view="day" class="${st.view === "day" ? "active" : ""}">Dia</button>
          </div>
          <div class="we-agenda-nav">
            <button class="we-icon-btn" id="agenda-prev">‹</button>
            <span id="agenda-label" class="we-agenda-label"></span>
            <button class="we-icon-btn" id="agenda-next">›</button>
          </div>
        </div>
      </div>
      <div id="agenda-body" class="we-agenda-body"></div>
    </div>
  `;

  WE.els("#agenda-view-toggle button").forEach((btn) =>
    btn.addEventListener("click", () => {
      st.view = btn.dataset.view;
      WE.views.agenda(content);
    })
  );
  WE.el("#agenda-prev").addEventListener("click", () => {
    shiftCursor(-1);
    WE.views.agenda(content);
  });
  WE.el("#agenda-next").addEventListener("click", () => {
    shiftCursor(1);
    WE.views.agenda(content);
  });

  await renderAgendaBody();
};

function shiftCursor(dir) {
  const st = WE.agendaState;
  const c = new Date(st.cursor);
  if (st.view === "month") c.setMonth(c.getMonth() + dir);
  else if (st.view === "week") c.setDate(c.getDate() + dir * 7);
  else c.setDate(c.getDate() + dir);
  st.cursor = c;
}

async function renderAgendaBody() {
  const st = WE.agendaState;
  const meId = WE.state.session.user.id;
  const body = WE.el("#agenda-body");
  const label = WE.el("#agenda-label");

  if (st.view === "month") {
    label.textContent = WE.monthLabel(st.cursor);
    const firstOfMonth = new Date(st.cursor.getFullYear(), st.cursor.getMonth(), 1);
    const gridStart = WE.startOfWeek(firstOfMonth);
    const days = Array.from({ length: 42 }, (_, i) => WE.addDays(gridStart, i));
    const rangeStart = days[0];
    const rangeEnd = WE.addDays(days[41], 1);
    let events = [];
    try {
      events = await WE.api.getEventsInRange(WE.state.family.id, rangeStart.toISOString(), rangeEnd.toISOString());
    } catch (e) {}
    body.innerHTML = `
      <div class="we-month-grid">
        ${["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d) => `<div class="we-month-weekday">${d}</div>`).join("")}
        ${days
          .map((day) => {
            const dayEvents = events.filter((ev) => WE.sameDay(new Date(ev.start_datetime), day));
            const inMonth = day.getMonth() === st.cursor.getMonth();
            const isToday = WE.sameDay(day, new Date());
            return `<div class="we-month-cell ${inMonth ? "" : "is-outside"} ${isToday ? "is-today" : ""}">
              <div class="we-month-daynum">${day.getDate()}</div>
              <div class="we-month-dots">
                ${dayEvents.slice(0, 3).map((ev) => `<div class="we-month-dot" data-event-id="${ev.id}" style="background:${(WE_CATEGORIES[ev.category]||WE_CATEGORIES.outros).color}">${WE.escapeHtml(ev.title)}</div>`).join("")}
                ${dayEvents.length > 3 ? `<div class="we-month-more">+${dayEvents.length - 3}</div>` : ""}
              </div>
            </div>`;
          })
          .join("")}
      </div>`;
    WE.els(".we-month-dot", body).forEach((dot) => dot.addEventListener("click", () => WE.navigate(`#/evento/${dot.dataset.eventId}`)));
  } else if (st.view === "week") {
    const weekStart = WE.startOfWeek(st.cursor);
    const weekEnd = WE.addDays(weekStart, 7);
    label.textContent = `${WE.fmtDateShort(weekStart)} – ${WE.fmtDateShort(WE.addDays(weekEnd, -1))}`;
    let events = [];
    try {
      events = await WE.api.getEventsInRange(WE.state.family.id, weekStart.toISOString(), weekEnd.toISOString());
    } catch (e) {}
    body.innerHTML = `
      <div class="we-week-columns">
        ${Array.from({ length: 7 }, (_, i) => {
          const day = WE.addDays(weekStart, i);
          const dayEvents = events
            .filter((ev) => WE.sameDay(new Date(ev.start_datetime), day))
            .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
          return `<div class="we-week-col ${WE.sameDay(day, new Date()) ? "is-today" : ""}">
            <div class="we-week-col-head">${WE.weekdayShort(day)}<span>${day.getDate()}</span></div>
            <div class="we-week-col-body">
              ${dayEvents.length ? dayEvents.map((ev) => eventCardHtml(ev, meId)).join("") : `<div class="we-week-day-empty">—</div>`}
            </div>
          </div>`;
        }).join("")}
      </div>`;
    bindEventCardClicks(body);
  } else {
    label.textContent = WE.fmtDateLong(st.cursor);
    const dayStart = new Date(st.cursor.getFullYear(), st.cursor.getMonth(), st.cursor.getDate());
    const dayEnd = WE.addDays(dayStart, 1);
    let events = [];
    try {
      events = await WE.api.getEventsInRange(WE.state.family.id, dayStart.toISOString(), dayEnd.toISOString());
    } catch (e) {}
    events.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    body.innerHTML = `<div class="we-day-list">${
      events.length ? events.map((ev) => eventCardHtml(ev, meId)).join("") : `<div class="we-empty"><p class="we-empty-emoji">🌤️</p><p>Agenda tranquila por aqui.</p></div>`
    }</div>`;
    bindEventCardClicks(body);
  }
}
