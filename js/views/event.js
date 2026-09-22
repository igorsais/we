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

  const html = `
    <form id="event-form" class="we-event-form">
      <div class="we-modal-head">
        <h3>${isEdit ? "Editar compromisso" : "Adicionar compromisso"}</h3>
        <button type="button" class="we-icon-btn" id="event-form-close">${WE.icon("close")}</button>
      </div>
      <div class="we-modal-body">
        <label>Título
          <input type="text" name="title" required placeholder="Ex: Consulta do João" value="${WE.escapeHtml(existingEvent?.title || "")}"/>
        </label>

        <label>Categoria
          <select name="category">${categoryOptionsHtml(existingEvent?.category || "familia")}</select>
        </label>

        <div class="we-form-row">
          <label>Data
            <input type="date" name="date" required value="${toLocalInputDate(start)}"/>
          </label>
          <label class="we-checkbox-inline">
            <input type="checkbox" name="all_day" id="all-day-check" ${existingEvent?.all_day ? "checked" : ""}/> Evento de dia inteiro
          </label>
        </div>

        <div class="we-form-row" id="time-row" ${existingEvent?.all_day ? "hidden" : ""}>
          <label>Horário inicial
            <input type="time" name="start_time" value="${toLocalInputTime(start)}"/>
          </label>
          <label>Horário final
            <input type="time" name="end_time" value="${toLocalInputTime(end)}"/>
          </label>
        </div>

        <label class="we-autocomplete-wrap">Local
          <input type="text" name="location" id="location-input" autocomplete="off" placeholder="Buscar endereço..." value="${WE.escapeHtml(existingEvent?.location || "")}"/>
          <div id="location-suggestions" class="we-suggestions" hidden></div>
        </label>
        <div id="location-map-note" class="we-muted we-small" ${existingEvent?.latitude ? "" : "hidden"}>
          📍 Localização selecionada — <a href="#" id="open-in-maps" target="_blank" rel="noopener">abrir no mapa</a>
        </div>

        <div class="we-field-block">
          <p class="we-field-label">Participantes</p>
          <div class="we-participant-select-list">
            ${members
              .map((m) => {
                const prof = m.profiles;
                const checked = selectedParticipants.has(prof.id);
                return `
                <div class="we-participant-row" data-user-id="${prof.id}">
                  <label class="we-checkbox-inline">
                    <input type="checkbox" class="participant-check" data-user-id="${prof.id}" ${checked ? "checked" : ""}/>
                    ${WE.avatarHtml(prof, 28)} <span>${WE.escapeHtml(prof.name)}${prof.id===meId?" (você)":""} — ${WE.escapeHtml(prof.family_role_custom || prof.family_role || "")}</span>
                  </label>
                  <select class="participant-role-select" data-user-id="${prof.id}" ${checked ? "" : "disabled"}>
                    ${WE_PARTICIPANT_ROLES.map((r) => `<option value="${r.value}" ${selectedParticipants.get(prof.id) === r.value ? "selected" : ""}>${r.label}</option>`).join("")}
                  </select>
                </div>`;
              })
              .join("")}
          </div>
        </div>

        <div id="conflict-warning" class="we-conflict-box" hidden></div>

        <label>Observações <span class="we-optional">(opcional)</span>
          <textarea name="notes" rows="2" placeholder="Ex: Levar documentos e carteirinha.">${WE.escapeHtml(existingEvent?.notes || "")}</textarea>
        </label>

        <p class="we-form-error" id="event-form-error" hidden></p>
      </div>
      <div class="we-modal-foot">
        <button type="button" class="we-btn we-btn-ghost" id="event-form-cancel">Cancelar</button>
        <button type="submit" class="we-btn we-btn-primary" id="event-form-submit">${isEdit ? "Salvar alterações" : "Criar compromisso"}</button>
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
      scheduleConflictCheck();
    });
  });

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
    const { startD, endD } = getFormDatetimes();
    if (isNaN(startD) || isNaN(endD) || startD >= endD) {
      errEl.textContent = "Verifique a data e os horários informados.";
      errEl.hidden = false;
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
