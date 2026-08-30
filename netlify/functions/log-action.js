const { usersStore, activityStore, getJSON } = require("./_lib/store");
const { getSessionFromEvent, json } = require("./_lib/auth");

// Called by the frontend immediately before it applies any sensitive
// mutation (check-in, payment, room change, etc.). It re-reads the
// user's CURRENT record from the store — never trusts the client, and
// never trusts the (up to 2h old) JWT's cached permission snapshot — so
// a permission the Founder just revoked is enforced on the very next
// action, not just the next login. If denied, the frontend must not
// apply the local state change.
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false });

  const session = getSessionFromEvent(event);
  if (!session) return json(401, { ok: false, message: "ACCESS DENIED — tizimga kiring." });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, message: "Noto'g'ri so'rov" });
  }
  const { permission, action, room, reservation, oldValue, newValue } = body;

  const usStore = usersStore();
  const freshUser = await getJSON(usStore, session.sub.toLowerCase());
  if (!freshUser || freshUser.status !== "APPROVED") {
    return json(403, { ok: false, message: "ACCESS DENIED — hisobingiz faol emas." });
  }

  const allowed = freshUser.isFounder || (permission && freshUser.permissions && freshUser.permissions[permission] === true);
  if (!allowed) {
    return json(403, { ok: false, message: "ACCESS DENIED — sizda bu amal uchun ruxsat yo'q." });
  }

  const now = new Date();
  const actStore = activityStore();
  await actStore.set(`${Date.now()}-${Math.random().toString(36).slice(2)}`, JSON.stringify({
    ts: Date.now(),
    user: freshUser.username,
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 5),
    action: action || permission,
    room: room || null,
    reservation: reservation || null,
    oldValue: oldValue ?? null,
    newValue: newValue ?? null,
  }));

  return json(200, { ok: true });
};
