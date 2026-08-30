const { getStore } = require("@netlify/blobs");

// Two Netlify Blobs stores act as our database:
//  - "founder-auth-users":    one JSON blob per user, keyed by lowercase username
//  - "founder-auth-activity": one JSON blob per activity-log entry, keyed by a unique id
// Netlify Blobs is durable, server-side storage tied to the site (not the browser),
// so this data survives refreshes/deploys and is never visible to the client directly.

function usersStore() {
  return getStore({ name: "founder-auth-users", consistency: "strong" });
}

function activityStore() {
  return getStore({ name: "founder-auth-activity", consistency: "strong" });
}

async function getJSON(store, key) {
  const raw = await store.get(key);
  return raw ? JSON.parse(raw) : null;
}

async function setJSON(store, key, obj) {
  return store.set(key, JSON.stringify(obj));
}

async function listAllJSON(store) {
  const { blobs } = await store.list();
  const items = await Promise.all(blobs.map((b) => getJSON(store, b.key)));
  return items.filter(Boolean);
}

module.exports = { usersStore, activityStore, getJSON, setJSON, listAllJSON };
