import { jwtVerify } from "https://esm.sh/jose@5";

// This runs on Netlify's edge network BEFORE index.html is served —
// not in the browser, so it can't be bypassed by opening dev tools or
// editing client-side JS. If there's no valid, non-expired, APPROVED
// session cookie, the request is redirected to the public login page
// instead of ever receiving the app.
//
// Requires the JWT_SECRET environment variable to be available to Edge
// Functions in the Netlify UI (Site settings -> Environment variables ->
// set its scope to include "Edge functions").
export default async (request, context) => {
  const url = new URL(request.url);
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
  const token = match ? match[1] : null;
  const secret = Deno.env.get("JWT_SECRET");

  if (token && secret) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      if (payload && payload.status === "APPROVED") {
        return context.next();
      }
    } catch (e) {
      // invalid or expired token -> fall through to redirect below
    }
  }

  return Response.redirect(new URL("/login.html", url), 302);
};

export const config = { path: ["/", "/index.html"] };
