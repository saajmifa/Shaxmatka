const { usersStore, activityStore, getJSON } = require("./_lib/store");
const { verifyPassword, signSession, sessionCookie, json, safeUser } = require("./_lib/auth");
const { ensureFounder } = require("./_lib/ensureFounder");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, message: "Method not allowed" });

  await ensureFounder();

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, message: "Noto'g'ri so'rov" });
  }

  const { username, password } = body;
  if (!username || !password) {
    return json(400, { ok: false, message: "Login va parolni kiriting" });
  }

  const store = usersStore();
  const user = await getJSON(store, String(username).toLowerCase());
  if (!user) return json(401, { ok: false, message: "Login yoki parol noto'g'ri" });

  const validPw = await verifyPassword(password, user.passwordHash);
  if (!validPw) return json(401, { ok: false, message: "Login yoki parol noto'g'ri" });

  if (user.status !== "APPROVED") {
    const statusMsg = {
      PENDING: "Hisobingiz hali Founder tomonidan tasdiqlanmagan.",
      REJECTED: "Hisobingizga kirish rad etilgan.",
      SUSPENDED: "Hisobingiz vaqtincha to'xtatilgan.",
    }[user.status] || "Hisobingiz faol emas.";
    return json(403, { ok: false, message: `ACCESS DENIED — ${statusMsg}` });
  }

  const token = signSession(user);

  const now = new Date();
  const actStore = activityStore();
  await actStore.set(`${Date.now()}-${Math.random().toString(36).slice(2)}`, JSON.stringify({
    ts: Date.now(),
    user: user.username,
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 5),
    action: "Tizimga kirdi",
    room: null,
    reservation: null,
    oldValue: null,
    newValue: null,
  }));

  return json(200, { ok: true, user: safeUser(user) }, { "Set-Cookie": sessionCookie(token) });
};
