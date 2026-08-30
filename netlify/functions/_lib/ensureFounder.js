const { usersStore, setJSON, listAllJSON } = require("./store");
const { hashPassword, founderPermissions } = require("./auth");

// On first-ever login attempt, if no Founder account exists yet in the
// store, create one from FOUNDER_USERNAME / FOUNDER_PASSWORD environment
// variables. After that first run, this is a no-op forever (a Founder
// already exists and this function will never create a second one or
// touch the existing Founder account).
async function ensureFounder() {
  const store = usersStore();
  const all = await listAllJSON(store);
  if (all.some((u) => u.isFounder)) return;

  const username = process.env.FOUNDER_USERNAME;
  const password = process.env.FOUNDER_PASSWORD;
  if (!username || !password) return; // Nothing to bootstrap yet — env vars not set.

  const founder = {
    username,
    passwordHash: await hashPassword(password),
    role: "FOUNDER",
    status: "APPROVED",
    isFounder: true,
    permissions: founderPermissions(),
    createdAt: Date.now(),
    createdBy: "system-bootstrap",
  };
  await setJSON(store, username.toLowerCase(), founder);
}

module.exports = { ensureFounder };
