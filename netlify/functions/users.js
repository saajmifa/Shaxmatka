const { usersStore, getJSON, setJSON, listAllJSON } = require("./_lib/store");
const {
  getSessionFromEvent,
  json,
  safeUser,
  hashPassword,
  emptyPermissions,
  ALL_PERMISSIONS,
} = require("./_lib/auth");

// Everything in this file is Founder-only, per spec: "Only Founder can
// grant or revoke access." The Founder account itself can never be
// modified or removed through these endpoints.
function requireFounder(event) {
  const session = getSessionFromEvent(event);
  if (!session || !session.isFounder || session.status !== "APPROVED") return null;
  return session;
}

exports.handler = async (event) => {
  const session = requireFounder(event);
  if (!session) return json(403, { ok: false, message: "ACCESS DENIED — faqat Founder ushbu bo'limga kira oladi." });

  const store = usersStore();

  if (event.httpMethod === "GET") {
    const all = await listAllJSON(store);
    return json(200, { ok: true, users: all.map(safeUser) });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, message: "Noto'g'ri so'rov" });
  }

  if (event.httpMethod === "POST") {
    const { username, password, role, status } = body;
    if (!username || !password) return json(400, { ok: false, message: "Login va parol shart" });
    const key = String(username).toLowerCase();
    const existing = await getJSON(store, key);
    if (existing) return json(409, { ok: false, message: "Bu login allaqachon mavjud" });

    const user = {
      username,
      passwordHash: await hashPassword(password),
      role: ["ADMIN", "STAFF", "VIEWER"].includes(role) ? role : "STAFF",
      status: ["PENDING", "APPROVED"].includes(status) ? status : "PENDING",
      isFounder: false,
      permissions: emptyPermissions(),
      createdAt: Date.now(),
      createdBy: session.sub,
    };
    await setJSON(store, key, user);
    return json(200, { ok: true, user: safeUser(user) });
  }

  if (event.httpMethod === "PATCH") {
    const { username, action, role, permissions } = body;
    if (!username) return json(400, { ok: false, message: "username kerak" });
    const key = String(username).toLowerCase();
    const target = await getJSON(store, key);
    if (!target) return json(404, { ok: false, message: "Foydalanuvchi topilmadi" });
    if (target.isFounder) return json(403, { ok: false, message: "Founder hisobini o'zgartirib bo'lmaydi" });

    if (action === "approve") target.status = "APPROVED";
    else if (action === "reject") target.status = "REJECTED";
    else if (action === "suspend") target.status = "SUSPENDED";
    else if (action === "restore") target.status = "APPROVED";
    else if (action === "setRole" && ["ADMIN", "STAFF", "VIEWER"].includes(role)) target.role = role;
    else if (action === "setPermissions" && permissions && typeof permissions === "object") {
      const next = { ...target.permissions };
      for (const p of ALL_PERMISSIONS) {
        if (typeof permissions[p] === "boolean") next[p] = permissions[p];
      }
      target.permissions = next;
    } else {
      return json(400, { ok: false, message: "Noma'lum amal" });
    }

    await setJSON(store, key, target);
    return json(200, { ok: true, user: safeUser(target) });
  }

  if (event.httpMethod === "DELETE") {
    const { username } = body;
    const key = String(username || "").toLowerCase();
    const target = await getJSON(store, key);
    if (!target) return json(404, { ok: false, message: "Foydalanuvchi topilmadi" });
    if (target.isFounder) return json(403, { ok: false, message: "Founder hisobini o'chirib bo'lmaydi" });
    await store.delete(key);
    return json(200, { ok: true });
  }

  return json(405, { ok: false, message: "Method not allowed" });
};
