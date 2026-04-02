import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const CANONICAL_HOST = "events.webbysalespro.com";
const NETLIFY_HOST_SUFFIXES = [".netlify.app", ".netlify.com"];

// Room paths that may receive a join token directly (e.g. from email links or backend-generated URLs).
const ROOM_PATH_SUFFIXES = ["/live", "/waiting-room", "/early-access-room"];

const SESSION_COOKIE = "attendee_session";
// Short-lived cookie set when we forward to /join/live — prevents an infinite
// room → /join/live → room loop if the session cookie never lands.
const JOIN_REDIRECT_COOKIE = "_join_redirect";

function isNetlifyHost(hostname: string) {
  return NETLIFY_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix),
  );
}

export function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const hostname = nextUrl.hostname.toLowerCase();

  // Canonical host redirect (Netlify preview → production)
  if (isNetlifyHost(hostname) && hostname !== CANONICAL_HOST) {
    const redirectUrl = nextUrl.clone();
    redirectUrl.protocol = "https";
    redirectUrl.host = CANONICAL_HOST;
    return NextResponse.redirect(redirectUrl, 301);
  }

  // If a join token arrives on a room path (e.g. /[sessionId]/live?t=...&webinar_id=...)
  // forward it to /join/live which resolves the token, sets the cookie, and redirects correctly.
  // Flow: room → /join/live → room (with cookie)  ✓
  // Loop guard: room → /join/live → room (no cookie, _join_redirect set) → register
  const t = nextUrl.searchParams.get("t");
  const webinarId = nextUrl.searchParams.get("webinar_id");
  const hasRoomSuffix = ROOM_PATH_SUFFIXES.some((s) => nextUrl.pathname.endsWith(s));
  const alreadyTriedJoin = request.cookies.has(JOIN_REDIRECT_COOKIE);

  // Always route join-link URLs through /join/live — the token resolves the real
  // sessionId which may differ from the [id] segment in the original join URL.
  // A cookie alone cannot substitute for that resolution step.
  if (t && webinarId && hasRoomSuffix) {
    if (alreadyTriedJoin) {
      // Already forwarded through /join/live but still no session — send to register.
      const registerUrl = nextUrl.clone();
      registerUrl.pathname = `/${webinarId}/register`;
      registerUrl.search = "";
      const res = NextResponse.redirect(registerUrl);
      res.cookies.delete(JOIN_REDIRECT_COOKIE);
      return res;
    }

    // Forward to join handler and mark that we've tried.
    const joinUrl = nextUrl.clone();
    joinUrl.pathname = "/join/live";
    const res = NextResponse.redirect(joinUrl);
    res.cookies.set(JOIN_REDIRECT_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 15, // 15 seconds — long enough to survive the round-trip
    });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|ivs/).*)",
  ],
};
