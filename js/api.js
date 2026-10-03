// =========================================================
// We. — Camada de acesso a dados (Supabase)
// =========================================================
WE.api = {};

// ---------------------------------------------------------
// AUTH
// ---------------------------------------------------------
WE.api.signUp = async (name, email, password) => {
  // Se a pessoa chegou aqui por um link de convite, o token foi salvo no
  // localStorage (ver WE.views.inviteLanding). Levamos ele para dentro do link
  // de confirmação de email, assim o convite "sobrevive" mesmo que o link de
  // confirmação seja aberto num app/navegador diferente de onde o cadastro foi
  // preenchido (ex: abriu o convite no Gmail, mas a confirmação abre no Safari).
  const inviteToken = localStorage.getItem("we_invite_token");
  const redirectPath = inviteToken ? `#/convite?token=${inviteToken}` : `#/entrar`;
  const emailRedirectTo = `${location.origin}${location.pathname}${redirectPath}`;
  const { data, error } = await supa.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo },
  });
  if (error) throw error;
  return data;
};

WE.api.signIn = async (email, password) => {
  const { data, error } = await supa.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

WE.api.signOut = async () => {
  await supa.auth.signOut();
};

WE.api.getSession = async () => {
  const { data } = await supa.auth.getSession();
  return data.session;
};

WE.api.updatePassword = async (newPassword) => {
  const { error } = await supa.auth.updateUser({ password: newPassword });
  if (error) throw error;
};

// ---------------------------------------------------------
// PROFILE
// ---------------------------------------------------------
WE.api.getMyProfile = async () => {
  const session = await WE.api.getSession();
  if (!session) return null;
  const { data, error } = await supa.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
  if (error) throw error;
  return data;
};

WE.api.upsertProfile = async (fields) => {
  const session = await WE.api.getSession();
  const payload = { id: session.user.id, email: session.user.email, ...fields };
  const { data, error } = await supa.from("profiles").upsert(payload).select().single();
  if (error) throw error;
  return data;
};

WE.api.getProfilesByIds = async (ids) => {
  if (!ids || !ids.length) return [];
  const { data, error } = await supa.from("profiles").select("*").in("id", ids);
  if (error) throw error;
  return data;
};

WE.api.uploadAvatar = async (file, userId) => {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supa.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supa.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
};

// ---------------------------------------------------------
// FAMILY
// ---------------------------------------------------------
WE.api.getMyFamily = async () => {
  const session = await WE.api.getSession();
  if (!session) return null;
  const { data: memberRows, error } = await supa
    .from("family_members")
    .select("*, families(*)")
    .eq("user_id", session.user.id)
    .eq("status", "active")
    .limit(1);
  if (error) throw error;
  if (!memberRows || !memberRows.length) return null;
  return { ...memberRows[0].families, myRole: memberRows[0].role };
};

WE.api.createFamily = async (name) => {
  const session = await WE.api.getSession();
  const { data: fam, error } = await supa
    .from("families")
    .insert({ name, owner_id: session.user.id })
    .select()
    .single();
  if (error) throw error;
  const { error: memErr } = await supa
    .from("family_members")
    .insert({ family_id: fam.id, user_id: session.user.id, role: "admin", status: "active" });
  if (memErr) throw memErr;
  return fam;
};

WE.api.getFamilyMembers = async (familyId) => {
  const { data, error } = await supa
    .from("family_members")
    .select("*, profiles(*)")
    .eq("family_id", familyId)
    .eq("status", "active");
  if (error) throw error;
  return data;
};

WE.api.removeFamilyMember = async (memberRowId) => {
  const { error } = await supa.from("family_members").delete().eq("id", memberRowId);
  if (error) throw error;
};

// ---------------------------------------------------------
// INVITATIONS
// ---------------------------------------------------------
WE.api.createInvitation = async (familyId, email) => {
  const session = await WE.api.getSession();
  const { data, error } = await supa
    .from("invitations")
    .insert({ family_id: familyId, invited_email: email.trim().toLowerCase(), invited_by: session.user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
};

WE.api.getFamilyInvitations = async (familyId) => {
  const { data, error } = await supa
    .from("invitations")
    .select("*")
    .eq("family_id", familyId)
    .eq("status", "pending");
  if (error) throw error;
  return data;
};

WE.api.getInvitationByToken = async (token) => {
  const { data, error } = await supa.from("invitations").select("*, families(*)").eq("token", token).maybeSingle();
  if (error) throw error;
  return data;
};

WE.api.getMyPendingInvitations = async () => {
  const session = await WE.api.getSession();
  if (!session?.user?.email) return [];
  const { data, error } = await supa
    .from("invitations")
    .select("*, families(*)")
    .eq("invited_email", session.user.email.toLowerCase())
    .eq("status", "pending");
  if (error) throw error;
  return data;
};

// Envia o email real do convite via EmailJS (direto do navegador, sem servidor).
// Se o EmailJS não estiver configurado ainda, não faz nada (o convite já foi
// criado no banco normalmente; só o email automático fica pendente).
WE.api.sendInviteEmail = async ({ toEmail, familyName, inviterName, inviteLink }) => {
  if (!window.WE_EMAILJS_READY || !window.emailjs) return { sent: false, reason: "not-configured" };
  try {
    await emailjs.send(window.WE_EMAILJS.SERVICE_ID, window.WE_EMAILJS.TEMPLATE_ID, {
      to_email: toEmail,
      family_name: familyName || "sua família",
      inviter_name: inviterName || "Alguém da família",
      invite_link: inviteLink,
    });
    return { sent: true };
  } catch (err) {
    console.error("Falha ao enviar email de convite:", err);
    return { sent: false, reason: err };
  }
};

WE.api.acceptInvitation = async (invitation) => {
  const session = await WE.api.getSession();
  const { error: memErr } = await supa
    .from("family_members")
    .insert({ family_id: invitation.family_id, user_id: session.user.id, role: "member", status: "active" });
  if (memErr && memErr.code !== "23505") throw memErr; // ignore duplicate (already a member)
  const { error } = await supa.from("invitations").update({ status: "accepted" }).eq("id", invitation.id);
  if (error) throw error;
};

// ---------------------------------------------------------
// EVENTS
// ---------------------------------------------------------
WE.api.getEventsInRange = async (familyId, fromIso, toIso) => {
  const { data, error } = await supa
    .from("events")
    .select("*, event_participants(*, profiles(*))")
    .eq("family_id", familyId)
    .eq("status", "active")
    .lt("start_datetime", toIso)
    .gt("end_datetime", fromIso)
    .order("start_datetime", { ascending: true });
  if (error) throw error;
  return data;
};

WE.api.getEvent = async (eventId) => {
  const { data, error } = await supa
    .from("events")
    .select("*, event_participants(*, profiles(*)), families(*)")
    .eq("id", eventId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

WE.api.checkConflicts = async (familyId, participantIds, startIso, endIso, excludeEventId) => {
  if (!participantIds.length) return [];
  let query = supa
    .from("events")
    .select("*, event_participants!inner(user_id, profiles(*))")
    .eq("family_id", familyId)
    .eq("status", "active")
    .lt("start_datetime", endIso)
    .gt("end_datetime", startIso)
    .in("event_participants.user_id", participantIds);
  if (excludeEventId) query = query.neq("id", excludeEventId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

WE.api.createEvent = async (payload, participants) => {
  const session = await WE.api.getSession();
  const { data: ev, error } = await supa
    .from("events")
    .insert({ ...payload, created_by: session.user.id })
    .select()
    .single();
  if (error) throw error;
  if (participants.length) {
    const rows = participants.map((p) => ({
      event_id: ev.id,
      user_id: p.userId,
      role: p.role,
      response_status: p.response_status || "pending",
      responded_at: p.responded_at || null,
    }));
    const { error: partErr } = await supa.from("event_participants").insert(rows);
    if (partErr) throw partErr;
  }
  // notify participants (except creator)
  const notifRows = participants
    .filter((p) => p.userId !== session.user.id)
    .map((p) => ({
      user_id: p.userId,
      type: "new_event",
      event_id: ev.id,
      message: `Novo compromisso: ${payload.title}`,
    }));
  if (notifRows.length) await supa.from("notifications").insert(notifRows);
  return ev;
};

WE.api.updateEvent = async (eventId, payload, participants) => {
  const { error } = await supa.from("events").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", eventId);
  if (error) throw error;
  if (participants) {
    await supa.from("event_participants").delete().eq("event_id", eventId);
    if (participants.length) {
      const rows = participants.map((p) => ({
        event_id: eventId,
        user_id: p.userId,
        role: p.role,
        response_status: p.response_status || "pending",
        responded_at: p.responded_at || null,
      }));
      const { error: partErr } = await supa.from("event_participants").insert(rows);
      if (partErr) throw partErr;
    }
  }
  const session = await WE.api.getSession();
  const notifRows = (participants || [])
    .filter((p) => p.userId !== session.user.id)
    .map((p) => ({
      user_id: p.userId,
      type: "event_updated",
      event_id: eventId,
      message: `Compromisso atualizado: ${payload.title}`,
    }));
  if (notifRows.length) await supa.from("notifications").insert(notifRows);
};

WE.api.cancelEvent = async (eventId, title, participantUserIds) => {
  const session = await WE.api.getSession();
  const { error } = await supa.from("events").update({ status: "cancelled" }).eq("id", eventId);
  if (error) throw error;
  const notifRows = (participantUserIds || [])
    .filter((id) => id !== session.user.id)
    .map((id) => ({ user_id: id, type: "event_cancelled", event_id: eventId, message: `Compromisso cancelado: ${title}` }));
  if (notifRows.length) await supa.from("notifications").insert(notifRows);
};

WE.api.respondToEvent = async (eventId, response) => {
  const session = await WE.api.getSession();
  const { error } = await supa
    .from("event_participants")
    .update({ response_status: response, responded_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .eq("user_id", session.user.id);
  if (error) throw error;

  const ev = await WE.api.getEvent(eventId);
  if (ev && ev.created_by !== session.user.id) {
    const me = await WE.api.getMyProfile();
    await supa.from("notifications").insert({
      user_id: ev.created_by,
      type: response === "accepted" ? "participant_accepted" : "participant_declined",
      event_id: eventId,
      message: `${me?.name || "Alguém"} ${response === "accepted" ? "confirmou presença" : "recusou"} em: ${ev.title}`,
    });
  }
};

// ---------------------------------------------------------
// NOTIFICATIONS
// ---------------------------------------------------------
WE.api.getNotifications = async () => {
  const session = await WE.api.getSession();
  const { data, error } = await supa
    .from("notifications")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return data;
};

WE.api.markNotificationRead = async (id) => {
  await supa.from("notifications").update({ read: true }).eq("id", id);
};

WE.api.markAllNotificationsRead = async () => {
  const session = await WE.api.getSession();
  await supa.from("notifications").update({ read: true }).eq("user_id", session.user.id).eq("read", false);
};

WE.api.unreadNotificationCount = async () => {
  const session = await WE.api.getSession();
  const { count, error } = await supa
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.user.id)
    .eq("read", false);
  if (error) throw error;
  return count || 0;
};

// ---------------------------------------------------------
// LEMBRETES (checagem client-side + notificações in-app)
// ---------------------------------------------------------
// Verifica compromissos da família cujo lembrete já "venceu" e ainda não
// gerou notificação para algum participante. Cria as notificações que
// faltarem. É seguro chamar isso repetidamente (evita duplicar).
WE.api.checkDueReminders = async (familyId) => {
  if (!familyId) return;
  const now = new Date();
  const horizon = new Date(now.getTime() + 3 * 24 * 60 * 60000); // até 3 dias no futuro (cobre a maior opção de lembrete)
  const { data: events, error } = await supa
    .from("events")
    .select("id, title, start_datetime, reminder_minutes, status, event_participants(user_id)")
    .eq("family_id", familyId)
    .eq("status", "active")
    .not("reminder_minutes", "is", null)
    .gte("start_datetime", now.toISOString())
    .lte("start_datetime", horizon.toISOString());
  if (error || !events || !events.length) return;

  const dueEvents = events.filter((ev) => {
    const start = new Date(ev.start_datetime);
    const reminderAt = new Date(start.getTime() - ev.reminder_minutes * 60000);
    return now >= reminderAt && now < start;
  });
  if (!dueEvents.length) return;

  const eventIds = dueEvents.map((e) => e.id);
  const { data: existing } = await supa
    .from("notifications")
    .select("user_id, event_id")
    .eq("type", "reminder")
    .in("event_id", eventIds);
  const alreadyNotified = new Set((existing || []).map((n) => `${n.event_id}:${n.user_id}`));

  const rows = [];
  for (const ev of dueEvents) {
    const minutesLabel = WE.reminderLabel(ev.reminder_minutes);
    for (const p of ev.event_participants || []) {
      const key = `${ev.id}:${p.user_id}`;
      if (alreadyNotified.has(key)) continue;
      rows.push({
        user_id: p.user_id,
        type: "reminder",
        event_id: ev.id,
        message: `Lembrete: "${ev.title}" começa em ${minutesLabel}.`,
      });
    }
  }
  if (rows.length) {
    await supa.from("notifications").insert(rows);
    // Dispara também um push real (se o dispositivo tiver assinatura), via Edge Function.
    try {
      await supa.functions.invoke(window.WE_PUSH_FUNCTION_NAME || "send-reminder-push", { body: { event_ids: dueEvents.map((e) => e.id) } });
    } catch (e) {
      // Se a function não estiver configurada ainda, a notificação in-app já foi criada — sem problema.
    }
  }
};

// ---------------------------------------------------------
// PUSH SUBSCRIPTIONS (notificações push reais no navegador/celular)
// ---------------------------------------------------------
WE.api.savePushSubscription = async (sub) => {
  const session = await WE.api.getSession();
  const json = sub.toJSON ? sub.toJSON() : sub;
  const { error } = await supa.from("push_subscriptions").upsert(
    {
      user_id: session.user.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: "endpoint" }
  );
  if (error) throw error;
};

WE.api.deletePushSubscription = async (endpoint) => {
  await supa.from("push_subscriptions").delete().eq("endpoint", endpoint);
};

// ---------------------------------------------------------
// EXCLUIR CONTA (via Edge Function — precisa de service role, que o
// navegador nunca tem acesso direto; a function só apaga a conta de quem
// está autenticado fazendo a própria chamada, nunca a de outra pessoa).
// ---------------------------------------------------------
WE.api.deleteMyAccount = async () => {
  const { data, error } = await supa.functions.invoke(window.WE_DELETE_ACCOUNT_FUNCTION_NAME || "delete-account");
  if (error) throw error;
  return data;
};

// ---------------------------------------------------------
// GEOCODING (OpenStreetMap Nominatim — gratuito, sem chave)
// ---------------------------------------------------------
WE.api.searchAddress = async (query) => {
  if (!query || query.trim().length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=0&limit=6&countrycodes=br&accept-language=pt-BR&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((d) => ({ label: d.display_name, lat: parseFloat(d.lat), lon: parseFloat(d.lon) }));
  } catch (e) {
    return [];
  }
};
