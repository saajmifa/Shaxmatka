const { usersStore, getJSON } = require("./_lib/store");
const { getSessionFromEvent, json, safeUser } = require("./_lib/auth");

// Always re-reads the live user record from the store rather than trusting
// the JWT's cached role/permissions/status — so a Founder's change (revoke
// a permission, suspend a user) is reflected the moment the client next
// calls /me, not only when the token eventually expires.
exports.handler = async (event) => {
  const session = getSessionFromEvent(event);
  if (!session) return json(401, { ok: false });

  const store = usersStore();
  const user = await getJSON(store, session.sub.toLowerCase());
  if (!user || user.status !== "APPROVED") return json(401, { ok: false });

  return json(200, { ok: true, user: safeUser(user) });
};
