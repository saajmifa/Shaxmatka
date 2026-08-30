const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const ALL_PERMISSIONS = [
  "ACCESS_ADMIN_PANEL",
  "ACCESS_SHAXMATKA",
  "CREATE_RESERVATION",
  "EDIT_RESERVATION",
  "MOVE_RESERVATION",
  "CHANGE_ROOM",
  "CHECK_IN",
  "CHECK_OUT",
  "ADD_PAYMENT",
  "EDIT_PAYMENT",
  "CHANGE_ROOM_STATUS",
  "VIEW_ACTIVITY",
];

function emptyPermissions() {
  return Object.fromEntries(ALL_PERMISSIONS.map((p) => [p, false]));
}

function founderPermissions() {
  return Object.fromEntries(ALL_PERMISSIONS.map((p) => [p, true]));
}

async function hashPassword(pw) {
  return bcrypt.hash(pw, 10);
}

async function verifyPassword(pw, hash) {
  return bcrypt.compare(pw, hash);
}

// Session tokens are short-lived (2h) so that a Founder suspending/revoking
// someone takes effect for page access quickly even though the JWT itself
// is stateless. Every function that touches user data or performs a
// mutation re-reads the live record from the store anyway (see users.js /
// log-action.js) instead of trusting the JWT's cached fields.
const SESSION_TTL = "2h";

function signSession(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return jwt.sign(
    {
      sub: user.username,
      role: user.role,
      isFounder: !!user.isFounder,
      status: user.status,
      permissions: user.permissions,
    },
    secret,
    { expiresIn: SESSION_TTL }
  );
}

function verifySession(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    return null;
  }
}

function parseCookies(event) {
  const header = (event.headers && (event.headers.cookie || event.headers.Cookie)) || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const idx = p.indexOf("=");
        if (idx === -1) return [p, ""];
        return [decodeURIComponent(p.slice(0, idx)), decodeURIComponent(p.slice(idx + 1))];
      })
  );
}

function sessionCookie(token) {
  return `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${2 * 60 * 60}`;
}

function clearCookie() {
  return `session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function getSessionFromEvent(event) {
  const cookies = parseCookies(event);
  if (!cookies.session) return null;
  return verifySession(cookies.session);
}

function json(statusCode, body, extraHeaders) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...(extraHeaders || {}) },
    body: JSON.stringify(body),
  };
}

function safeUser(u) {
  return {
    username: u.username,
    role: u.role,
    status: u.status,
    isFounder: !!u.isFounder,
    permissions: u.permissions,
    createdAt: u.createdAt,
  };
}

module.exports = {
  ALL_PERMISSIONS,
  emptyPermissions,
  founderPermissions,
  hashPassword,
  verifyPassword,
  signSession,
  verifySession,
  parseCookies,
  sessionCookie,
  clearCookie,
  getSessionFromEvent,
  json,
  safeUser,
};
