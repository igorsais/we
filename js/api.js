// =========================================================
// We. — Camada de acesso a dados (Supabase)
// =========================================================
WE.api = {};

// ---------------------------------------------------------
// AUTH
// ---------------------------------------------------------
WE.api.signUp = async (name, email, password) => {
  const { data, error } = await supa.auth.signUp({
    email,
    password,
    options: { data: { name } },
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
    const rows = participants.map((p) => ({ event_id: ev.id, user_id: p.userId, role: p.role }));
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
      const rows = participants.map((p) => ({ event_id: eventId, user_id: p.userId, role: p.role }));
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
// GEOCODING (OpenStreetMap Nominatim — gratuito, sem chave)
// ---------------------------------------------------------
WE.api.searchAddress = async (query) => {
  if (!query || query.trim().length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=0&limit=5&accept-language=pt-BR&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((d) => ({ label: d.display_name, lat: parseFloat(d.lat), lon: parseFloat(d.lon) }));
  } catch (e) {
    return [];
  }
};
