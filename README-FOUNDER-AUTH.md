# Founder Authorization System — Setup

This adds a real backend (Netlify Functions + Netlify Blobs as the database)
on top of your existing Shaxmatka. The Shaxmatka's booking/room/pricing
logic is untouched — this only adds login, roles, permissions, and an
activity log, enforced on the server.

## What changed structurally

- This is **no longer a drag-and-drop static site** — it now needs Netlify's
  build/Functions/Edge Functions features, so it must be deployed as a
  connected Git repo (or via `netlify deploy` from the CLI), not
  netlify.com/drop.
- `index.html` — same Shaxmatka as before, plus a login-aware wrapper,
  a small top bar, and a Founder access-management panel. No existing
  booking/room/pricing code was removed or redesigned.
- `login.html` — new, public login page.
- `netlify/functions/` — the backend: login, logout, session check,
  user management (Founder-only), activity log, and the action-authorization
  check every sensitive Shaxmatka action now goes through.
- `netlify/edge-functions/gate.js` — blocks direct access to `/` and
  `/index.html` at Netlify's edge (before any HTML reaches the browser)
  unless a valid, approved session cookie is present.
- `netlify.toml` — wires the above together.

## One-time setup

1. **Push this folder to a Git repo** (GitHub/GitLab/Bitbucket) and connect
   it to a Netlify site (New site from Git). Netlify will detect
   `netlify.toml` automatically.

2. **Set environment variables** in Netlify: Site settings → Environment
   variables:
   - `JWT_SECRET` — any long random string (e.g. generate 32+ random
     characters). Must be scoped to **both** "Functions" and
     "Edge functions" (the scope selector when adding the variable).
   - `FOUNDER_USERNAME` — the login for your one Founder account.
   - `FOUNDER_PASSWORD` — its password. Use a strong one; it's hashed
     with bcrypt before being stored and is never kept in plain text.

3. **Deploy.** The Founder account is created automatically the first
   time anyone logs in with `FOUNDER_USERNAME` / `FOUNDER_PASSWORD` —
   there's no manual database step. After that first login, this bootstrap
   is permanently disabled (it will never create a second Founder or touch
   the existing one), so you can remove or keep the env vars either way.

4. **Log in as Founder**, open the "Boshqaruv paneli" (Founder panel) in
   the top bar, and add your staff accounts there — set their role
   (ADMIN / STAFF / VIEWER) and tick exactly the permissions each person
   needs (Admin Panel access and Shaxmatka access are separate toggles,
   as requested). New accounts start as PENDING until you approve them.

## How the security actually works

- **Passwords**: hashed with bcrypt, never stored or transmitted in plain
  text.
- **Sessions**: short-lived (2 hour) signed JWTs in an `httpOnly`,
  `Secure` cookie — not readable or forgeable from the browser console.
- **Page-level gate**: the edge function checks for a valid session cookie
  before `index.html` is served at all. No cookie → redirected to
  `/login.html` before any app code loads.
- **Action-level gate**: every sensitive action in the Shaxmatka (check-in,
  check-out, payments, room/date changes, room status changes) calls a
  server function that re-reads your **current** permissions from the
  database and only allows the action if it's still granted — it does not
  trust the cookie's cached permissions. A permission the Founder revokes
  takes effect on the very next action; suspending a user takes effect for
  page access within 2 hours at most (token expiry) and immediately for
  the admin panel and any new action.
- **Activity log**: written server-side, from the server's own record of
  who's making the call — the browser cannot spoof who performed an
  action.
- **Founder protection**: the Founder account can't be edited, disabled,
  or removed through any endpoint; only the Founder can approve, reject,
  suspend, restore, or set permissions/roles for other accounts.

## Known limitation, stated plainly

The Shaxmatka's room/reservation data itself (bookings, prices, rooms)
still lives only in the browser's memory, exactly as before — that part of
the app was intentionally left untouched per your instructions ("do not
redesign/rebuild the Shaxmatka"). What's now genuinely server-enforced is
*who can log in, who can reach the Shaxmatka/admin panel at all, and who is
permitted to perform each action* — plus a real, tamper-resistant activity
log of those actions. If you'd like the booking data itself moved to the
same backend (so it also persists and is shared live across users/devices
instead of resetting on refresh), that's a separate, larger piece of work —
just say the word.
