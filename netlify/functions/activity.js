const { activityStore, listAllJSON } = require("./_lib/store");
const { getSessionFromEvent, json } = require("./_lib/auth");

exports.handler = async (event) => {
  const session = getSessionFromEvent(event);
  if (!session || session.status !== "APPROVED") return json(401, { ok: false });
  if (!session.isFounder && !(session.permissions && session.permissions.VIEW_ACTIVITY)) {
    return json(403, { ok: false, message: "ACCESS DENIED — sizda faoliyat tarixini ko'rish huquqi yo'q." });
  }

  const store = activityStore();
  const all = await listAllJSON(store);
  all.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  return json(200, { ok: true, activity: all.slice(0, 500) });
};
