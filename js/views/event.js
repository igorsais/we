// =========================================================
// We. — Criar/editar compromisso + Detalhes
// =========================================================
WE.views = WE.views || {};

function categoryOptionsHtml(selected) {
  return Object.entries(WE_CATEGORIES)
    .map(([key, c]) => `<option value="${key}" ${key === selected ? "selected" : ""}>${c.icon} ${c.label}</option>`)
    .join("");
}

function toLocalInputDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toLocalInputTime(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

WE.views.openEventForm = async (existingEvent) => {
  const members = WE.state.members || [];
  const meId = WE.state.session.user.id;
  const isEdit = !!existingEvent;
  const start = existingEvent ? new Date(existingEvent.start_datetime) : new Date(Date.now() + 30 * 60000);
  const end = existingEvent ? new Date(existingEvent.end_datetime) : new Date(start.getTime() + 60 * 60000);
  const selectedParticipants = new Map(
    (existingEvent?.event_participants || []).map((p) => [p.profiles.id, p.role])
  );
  const priorStatus = new Map(
    (existingEvent?.event_participants || []).map((p) => [p.profiles.id, { response_status: p.response_status, responded_at: p.responded_at }])
  );
  if (!isEdit) selectedParticipants.set(meId, "responsavel");

  const STEP_LABELS = ["O que e quando", "Onde", "Quem vai"];
  const html = `
    <form id="event-form" class="we-event-form we-form">
      <div class="we-modal-head">
        <h3>${isEdit ? "Editar compromisso" : "Adicionar compromisso"}</h3>
        <button type="button" class="we-icon-btn" id="event-form-close">${WE.icon("close")}</button>
      </div>

      <div class="we-wizard-steps">
        <span class="we-step-dot active" data-dot="1"></span>
        <span class="we-step-dot" data-dot="2"></span>
        <span class="we-step-dot" data-dot="3"></span>
      </div>
      <p class="we-step-label" id="wizard-step-label">Passo 1 de 3 — ${STEP_LABELS[0]}</p>

      <div class="we-modal-body">
        <!-- ===== Passo 1: o que e quando ===== -->
        <div class="we-wizard-step active" data-step="1">
          <label class="we-field">Título
            <input type="text" name="title" placeholder="Ex: Consulta do João" value="${WE.escapeHtml(existingEvent?.title || "")}"/>
          </label>

          <div class="we-form-row">
            <label class="we-field">Categoria
              <select name="category">${categoryOptionsHtml(existingEvent?.category || "familia")}</select>
            </label>
            <label class="we-field">Lembrete
              <select name="reminder_minutes">
                ${WE_REMINDER_OPTIONS.map(
                  (o) => `<option value="${o.value}" ${String(existingEvent?.reminder_minutes ?? "") === o.value ? "selected" : ""}>${o.label}</option>`
                ).join("")}
              </select>
            </label>
          </div>

          <div class="we-switch-row">
            <span>Evento de dia inteiro</span>
            <label class="we-switch">
              <input type="checkbox" name="all_day" id="all-day-check" ${existingEvent?.all_day ? "checked" : ""}/>
              <span class="we-switch-track"></span>
            </label>
          </div>

          <label class="we-field">Data
            <input type="date" name="date" value="${toLocalInputDate(start)}"/>
          </label>

          <div class="we-form-row" id="time-row" ${existingEvent?.all_day ? "hidden" : ""}>
            <label class="we-field">Horário inicial
              <input type="time" name="start_time" value="${toLocalInputTime(start)}"/>
            </label>
            <label class="we-field">Horário final
              <input type="time" name="end_time" value="${toLocalInputTime(end)}"/>
            </label>
          </div>
          <p class="we-form-error" id="wizard-step1-error" hidden></p>
        </div>

        <!-- ===== Passo 2: onde ===== -->
        <div class="we-wizard-step" data-step="2">
          <label class="we-field we-autocomplete-wrap">Local
            <div class="we-input-icon">
              ${WE.icon("pin")}
              <input type="text" name="location" id="location-input" autocomplete="off" placeholder="Buscar endereço..." value="${WE.escapeHtml(existingEvent?.location || "")}"/>
            </div>
            <div id="location-suggestions" class="we-suggestions" hidden></div>
          </label>
          <div id="location-map-note" class="we-map-note" ${existingEvent?.latitude ? "" : "hidden"}>
            📍 Localização selecionada — <a href="#" id="open-in-maps" target="_blank" rel="noopener">abrir no mapa</a>
          </div>
        </div>

        <!-- ===== Passo 3: quem vai ===== -->
        <div class="we-wizard-step" data-step="3">
          <div class="we-field-block">
            <p class="we-field-label">Participantes</p>
            <div class="we-participant-select-list">
              ${members
                .map((m) => {
                  const prof = m.profiles;
                  const checked = selectedParticipants.has(prof.id);
                  return `
                  <div class="we-participant-row ${checked ? "checked" : ""}" data-user-id="${prof.id}">
                    <input type="checkbox" class="participant-check" data-user-id="${prof.id}" ${checked ? "checked" : ""}/>
                    ${WE.avatarHtml(prof, 34)}
                    <div class="we-participant-info">
                      <b>${WE.escapeHtml(prof.name)}${prof.id===meId?" (você)":""}</b>
                      <small>${WE.escapeHtml(prof.family_role_custom || prof.family_role || "")}</small>
                    </div>
                    <select class="participant-role-select" data-user-id="${prof.id}" ${checked ? "" : "disabled"}>
                      ${WE_PARTICIPANT_ROLES.map((r) => `<option value="${r.value}" ${selectedParticipants.get(prof.id) === r.value ? "selected" : ""}>${r.label}</option>`).join("")}
                    </select>
                  </div>`;
                })
                .join("")}
            </div>
          </div>

          <div id="conflict-warning" class="we-conflict-box" hidden></div>

          <label class="we-field">Observações <span class="we-optional">(opcional)</span>
            <textarea name="notes" rows="2" placeholder="Ex: Levar documentos e carteirinha.">${WE.escapeHtml(existingEvent?.notes || "")}</textarea>
          </label>

          <p class="we-form-error" id="event-form-error" hidden></p>
        </div>
      </div>
      <div class="we-modal-foot">
        <button type="button" class="we-btn we-btn-ghost" id="event-form-cancel">Cancelar</button>
        <button type="button" class="we-btn we-btn-ghost" id="wizard-back" hidden>Voltar</button>
        <button type="button" class="we-btn we-btn-primary" id="wizard-next">Continuar</button>
        <button type="submit" class="we-btn we-btn-primary" id="event-form-submit" hidden>${isEdit ? "Salvar alterações" : "Criar compromisso"}</button>
      </div>
    </form>
  `;

  WE.openModal(html, { wide: true, persistent: true });

  let selectedLatLon = existingEvent?.latitude ? { lat: existingEvent.latitude, lon: existingEvent.longitude } : null;
  let forceCreateAnyway = false;

  WE.el("#event-form-close").addEventListener("click", WE.closeModal);
  WE.el("#event-form-cancel").addEventListener("click", WE.closeModal);

  WE.el("#all-day-check").addEventListener("change", (e) => {
    WE.el("#time-row").hidden = e.target.checked;
  });

  // Participant checkboxes
  WE.els(".participant-check").forEach((chk) => {
    chk.addEventListener("change", () => {
      const sel = WE.el(`.participant-role-select[data-user-id="${chk.dataset.userId}"]`);
      sel.disabled = !chk.checked;
      WE.el(`.we-participant-row[data-user-id="${chk.dataset.userId}"]`).classList.toggle("checked", chk.checked);
      scheduleConflictCheck();
    });
  });

  // ---------------------------------------------------------
  // Navegação do assistente em passos (1 O que/quando · 2 Onde · 3 Quem vai)
  // ---------------------------------------------------------
  const STEP_LABELS_NAV = ["O que e quando", "Onde", "Quem vai"];
  const TOTAL_STEPS = 3;
  let currentStep = 1;

  function renderStep() {
    WE.els(".we-wizard-step").forEach((el) => el.classList.toggle("active", Number(el.dataset.step) === currentStep));
    WE.els(".we-step-dot").forEach((el) => el.classList.toggle("active", Number(el.dataset.dot) === currentStep));
    WE.el("#wizard-step-label").textContent = `Passo ${currentStep} de ${TOTAL_STEPS} — ${STEP_LABELS_NAV[currentStep - 1]}`;
    WE.el("#wizard-back").hidden = currentStep === 1;
    const isLast = currentStep === TOTAL_STEPS;
    WE.el("#wizard-next").hidden = isLast;
    WE.el("#event-form-submit").hidden = !isLast;
  }

  function validateStep1() {
    const errEl = WE.el("#wizard-step1-error");
    const title = WE.el('input[name="title"]').value.trim();
    const date = WE.el('input[name="date"]').value;
    if (!title) {
      errEl.textContent = "Dê um título para o compromisso.";
      errEl.hidden = false;
      return false;
    }
    if (!date) {
      errEl.textContent = "Escolha a data do compromisso.";
      errEl.hidden = false;
      return false;
    }
    const { startD, endD } = getFormDatetimes();
    if (isNaN(startD) || isNaN(endD) || startD >= endD) {
      errEl.textContent = "Verifique os horários — o final precisa vir depois do início.";
      errEl.hidden = false;
      return false;
    }
    errEl.hidden = true;
    return true;
  }

  WE.el("#wizard-next").addEventListener("click", () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep < TOTAL_STEPS) {
      currentStep++;
      renderStep();
    }
  });
  WE.el("#wizard-back").addEventListener("click", () => {
    if (currentStep > 1) {
      currentStep--;
      renderStep();
    }
  });
  // Enter em qualquer campo avança o passo em vez de submeter o formulário direto
  WE.el("#event-form").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && currentStep < TOTAL_STEPS) {
      e.preventDefault();
      WE.el("#wizard-next").click();
    }
  });
  renderStep();

  // Location autocomplete (Nominatim / OpenStreetMap — gratuito)
  const locInput = WE.el("#location-input");
  const suggBox = WE.el("#location-suggestions");
  const doSearch = WE.debounce(async () => {
    const q = locInput.value.trim();
    if (q.length < 3) {
      suggBox.hidden = true;
      return;
    }
    const results = await WE.api.searchAddress(q);
    if (!results.length) {
      suggBox.hidden = true;
      return;
    }
    suggBox.innerHTML = results.map((r, i) => `<div class="we-suggestion-item" data-i="${i}">📍 ${WE.escapeHtml(r.label)}</div>`).join("");
    suggBox.hidden = false;
    WE.els(".we-suggestion-item", suggBox).forEach((item) =>
      item.addEventListener("click", () => {
        const r = results[Number(item.dataset.i)];
        locInput.value = r.label;
        selectedLatLon = { lat: r.lat, lon: r.lon };
        suggBox.hidden = true;
        const note = WE.el("#location-map-note");
        note.hidden = false;
        WE.el("#open-in-maps").href = `https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lon}`;
      })
    );
  }, 400);
  locInput.addEventListener("input", () => {
    selectedLatLon = null;
    doSearch();
  });

  function getFormDatetimes() {
    const fd = new FormData(WE.el("#event-form"));
    const date = fd.get("date");
    const allDay = !!fd.get("all_day");
    let startD, endD;
    if (allDay) {
      startD = new Date(`${date}T00:00:00`);
      endD = new Date(`${date}T23:59:59`);
    } else {
      startD = new Date(`${date}T${fd.get("start_time") || "00:00"}:00`);
      endD = new Date(`${date}T${fd.get("end_time") || "23:59"}:00`);
    }
    return { startD, endD };
  }

  function getSelectedParticipants() {
    return WE.els(".participant-check")
      .filter((c) => c.checked)
      .map((c) => {
        const userId = c.dataset.userId;
        const member = members.find((m) => m.profiles.id === userId);
        const isCreatorRow = userId === meId;
        const isChildRow = member ? WE.isChildParticipant(member.profiles) : false;
        const autoConfirmed = isCreatorRow || isChildRow;
        const prior = priorStatus.get(userId);
        let response_status = "pending";
        let responded_at = null;
        if (autoConfirmed) {
          response_status = "accepted";
          responded_at = prior?.responded_at || new Date().toISOString();
        } else if (prior) {
          response_status = prior.response_status;
          responded_at = prior.responded_at;
        }
        return {
          userId,
          role: WE.el(`.participant-role-select[data-user-id="${userId}"]`).value,
          response_status,
          responded_at,
        };
      });
  }

  const scheduleConflictCheck = WE.debounce(async () => {
    forceCreateAnyway = false;
    const box = WE.el("#conflict-warning");
    const participants = getSelectedParticipants();
    if (!participants.length) {
      box.hidden = true;
      return;
    }
    const { startD, endD } = getFormDatetimes();
    if (isNaN(startD) || isNaN(endD) || startD >= endD) {
      box.hidden = true;
      return;
    }
    try {
      const conflicts = await WE.api.checkConflicts(
        WE.state.family.id,
        participants.map((p) => p.userId),
        startD.toISOString(),
        endD.toISOString(),
        existingEvent?.id
      );
      if (!conflicts.length) {
        box.hidden = true;
        return;
      }
      box.hidden = false;
      box.innerHTML = `
        <p class="we-conflict-title">⚠️ Conflito de agenda</p>
        ${conflicts
          .map((c) => {
            const names = (c.event_participants || []).map((p) => p.profiles?.name?.split(" ")[0]).join(", ");
            return `<p class="we-conflict-item">${WE.escapeHtml(names)} já ${c.event_participants.length > 1 ? "possuem" : "possui"} <strong>${WE.escapeHtml(c.title)}</strong> às ${WE.fmtTime(new Date(c.start_datetime))}.</p>`;
          })
          .join("")}
        <p class="we-muted we-small">Esse horário pode não funcionar para todo mundo. Você pode escolher outro horário ou criar mesmo assim.</p>
        <label class="we-checkbox-inline"><input type="checkbox" id="force-create-check"/> Criar mesmo assim</label>
      `;
      WE.el("#force-create-check").addEventListener("change", (e) => (forceCreateAnyway = e.target.checked));
    } catch (e) {
      box.hidden = true;
    }
  }, 350);

  WE.el("#event-form").addEventListener("input", scheduleConflictCheck);
  scheduleConflictCheck();

  WE.el("#event-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = WE.el("#event-form-error");
    errEl.hidden = true;
    const fd = new FormData(e.target);
    if (!fd.get("title").trim()) {
      currentStep = 1;
      renderStep();
      validateStep1();
      return;
    }
    const { startD, endD } = getFormDatetimes();
    if (isNaN(startD) || isNaN(endD) || startD >= endD) {
      currentStep = 1;
      renderStep();
      validateStep1();
      return;
    }
    const participants = getSelectedParticipants();
    if (!participants.length) {
      errEl.textContent = "Selecione ao menos um participante.";
      errEl.hidden = false;
      return;
    }

    const conflictBox = WE.el("#conflict-warning");
    if (!conflictBox.hidden && !forceCreateAnyway) {
      errEl.textContent = "Escolha outro horário ou marque \"Criar mesmo assim\".";
      errEl.hidden = false;
      return;
    }

    const payload = {
      family_id: WE.state.family.id,
      title: fd.get("title").trim(),
      category: fd.get("category"),
      start_datetime: startD.toISOString(),
      end_datetime: endD.toISOString(),
      all_day: !!fd.get("all_day"),
      location: fd.get("location")?.trim() || null,
      latitude: selectedLatLon?.lat ?? existingEvent?.latitude ?? null,
      longitude: selectedLatLon?.lon ?? existingEvent?.longitude ?? null,
      notes: fd.get("notes")?.trim() || null,
      reminder_minutes: fd.get("reminder_minutes") ? Number(fd.get("reminder_minutes")) : null,
    };

    const btn = WE.el("#event-form-submit");
    WE.loadingBtn(btn, true, "Salvando...");
    try {
      if (isEdit) {
        await WE.api.updateEvent(existingEvent.id, payload, participants);
        WE.toast("Compromisso atualizado!", "success");
      } else {
        await WE.api.createEvent(payload, participants);
        WE.toast("Compromisso criado! Sua família já pode acompanhar.", "success");
      }
      WE.closeModal();
      WE.navigate("#/hoje");
      if (location.hash === "#/hoje") WE.router();
    } catch (err) {
      errEl.textContent = WE.friendlyError(err);
      errEl.hidden = false;
    } finally {
      WE.loadingBtn(btn, false);
    }
  });
};

// ---------------------------------------------------------
// DETALHES DO COMPROMISSO
// ---------------------------------------------------------
WE.views.openEventDetails = async (eventId) => {
  WE.openModal(`<div class="we-modal-body we-center"><p class="we-muted">Carregando...</p></div>`);
  let ev;
  try {
    ev = await WE.api.getEvent(eventId);
  } catch (e) {}
  if (!ev) {
    WE.openModal(`<div class="we-modal-body we-center"><p>Compromisso não encontrado.</p></div>`);
    return;
  }
  const meId = WE.state.session.user.id;
  const cat = WE_CATEGORIES[ev.category] || WE_CATEGORIES.outros;
  const start = new Date(ev.start_datetime);
  const end = new Date(ev.end_datetime);
  const isCreator = ev.created_by === meId;
  const canCancel = isCreator || WE.state.family?.myRole === "admin";
  const myParticipant = (ev.event_participants || []).find((p) => p.profiles?.id === meId);
  const iAmExemptFromConfirming = isCreator || (myParticipant && WE.isChildParticipant(myParticipant.profiles));

  const html = `
    <div class="we-modal-head">
      <h3>${WE.escapeHtml(ev.title)}</h3>
      <button type="button" class="we-icon-btn" id="details-close">${WE.icon("close")}</button>
    </div>
    <div class="we-modal-body">
      ${ev.status === "cancelled" ? `<p class="we-status we-status-declined">Este compromisso foi cancelado.</p>` : ""}
      <div class="we-detail-row">${WE.categoryBadge(ev.category)}</div>
      <div class="we-detail-row">📅 ${WE.fmtDateLong(start)}</div>
      <div class="we-detail-row">🕒 ${ev.all_day ? "Dia inteiro" : `${WE.fmtTime(start)} — ${WE.fmtTime(end)}`}</div>
      ${ev.location ? `<div class="we-detail-row">📍 ${WE.escapeHtml(ev.location)} ${ev.latitude ? `<a href="https://www.google.com/maps/search/?api=1&query=${ev.latitude},${ev.longitude}" target="_blank" rel="noopener" class="we-link-more">Abrir no mapa</a>` : ""}</div>` : ""}
      ${ev.reminder_minutes ? `<div class="we-detail-row">${WE.icon("bell", "we-icon-inline")} Lembrete: ${WE_REMINDER_OPTIONS.find((o) => Number(o.value) === ev.reminder_minutes)?.label || `${ev.reminder_minutes} min antes`}</div>` : ""}

      <div class="we-field-block">
        <p class="we-field-label">Participantes</p>
        <div class="we-detail-participants">
          ${(ev.event_participants || [])
            .map((p) => {
              const prof = p.profiles || {};
              const roleLabel = WE_PARTICIPANT_ROLES.find((r) => r.value === p.role)?.label || p.role;
              const meta = WE.participantStatusMeta(p, ev.created_by);
              return `<div class="we-detail-participant">
                ${WE.avatarHtml(prof, 32)}
                <div>
                  <p>${WE.escapeHtml(prof.name)}${prof.id === meId ? " (você)" : ""}</p>
                  <p class="we-muted we-small">${roleLabel}${WE.isChildParticipant(prof) ? " · criança" : ""}</p>
                </div>
                <span class="we-status ${meta.cls}" title="${WE.escapeHtml(prof.id === meId ? meta.text : meta.textOther)}">${meta.icon}</span>
              </div>`;
            })
            .join("")}
        </div>
      </div>

      ${ev.notes ? `<div class="we-field-block"><p class="we-field-label">Observações</p><p>${WE.escapeHtml(ev.notes)}</p></div>` : ""}
      <p class="we-form-error" id="details-error" hidden></p>
    </div>
    <div class="we-modal-foot we-modal-foot-wrap">
      ${myParticipant && !iAmExemptFromConfirming && myParticipant.response_status === "pending" && ev.status === "active" ? `
        <button class="we-btn we-btn-primary" id="accept-btn">✓ Confirmar presença</button>
        <button class="we-btn we-btn-danger-outline" id="decline-btn">✕ Recusar</button>
      ` : ""}
      ${isCreator && ev.status === "active" ? `<button class="we-btn we-btn-ghost" id="edit-btn">Editar</button>` : ""}
      ${canCancel && ev.status === "active" ? `<button class="we-btn we-btn-danger-outline" id="cancel-btn">Cancelar compromisso</button>` : ""}
      <button class="we-btn we-btn-secondary" id="details-close-2">Fechar</button>
    </div>
  `;
  WE.openModal(html, { wide: true });

  WE.el("#details-close").addEventListener("click", WE.closeModal);
  WE.el("#details-close-2").addEventListener("click", WE.closeModal);

  const respond = async (status) => {
    try {
      await WE.api.respondToEvent(ev.id, status);
      WE.toast(status === "accepted" ? "Presença confirmada!" : "Você recusou este compromisso.", "success");
      WE.closeModal();
      WE.router();
    } catch (err) {
      WE.el("#details-error").textContent = WE.friendlyError(err);
      WE.el("#details-error").hidden = false;
    }
  };

  if (WE.el("#accept-btn")) WE.el("#accept-btn").addEventListener("click", () => respond("accepted"));
  if (WE.el("#decline-btn")) WE.el("#decline-btn").addEventListener("click", () => respond("declined"));
  if (WE.el("#edit-btn"))
    WE.el("#edit-btn").addEventListener("click", () => {
      WE.closeModal();
      WE.views.openEventForm(ev);
    });
  if (WE.el("#cancel-btn"))
    WE.el("#cancel-btn").addEventListener("click", async () => {
      if (!confirm("Tem certeza que deseja cancelar este compromisso?")) return;
      try {
        const participantIds = (ev.event_participants || []).map((p) => p.profiles.id);
        await WE.api.cancelEvent(ev.id, ev.title, participantIds);
        WE.toast("Compromisso cancelado.", "success");
        WE.closeModal();
        WE.router();
      } catch (err) {
        WE.el("#details-error").textContent = WE.friendlyError(err);
        WE.el("#details-error").hidden = false;
      }
    });
};
