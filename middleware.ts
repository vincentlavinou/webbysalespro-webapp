import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const CANONICAL_HOST = "events.webbysalespro.com";
const NETLIFY_HOST_SUFFIXES = [".netlify.app", ".netlify.com"];

// Room paths that may receive a join token directly (e.g. from email links or backend-generated URLs).
const ROOM_PATH_SUFFIXES = ["/live", "/waiting-room", "/early-access-room", "/completed"];

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

  // Room URLs are not canonical entry points. If a token lands on /live, /waiting-room,
  // /early-access-room, or /completed, always restart from /join/live so the backend can
  // resolve the token into the correct webinar/session pair and mint a fresh attendee cookie.
  const t = nextUrl.searchParams.get("t");
  const webinarId = nextUrl.searchParams.get("webinar_id");
  const hasRoomSuffix = ROOM_PATH_SUFFIXES.some((s) => nextUrl.pathname.endsWith(s));
  const hasCookie = request.cookies.has(SESSION_COOKIE);
  const alreadyTriedJoin = request.cookies.has(JOIN_REDIRECT_COOKIE);

  if (hasRoomSuffix && webinarId && !t) {
    const registerUrl = nextUrl.clone();
    registerUrl.pathname = `/${webinarId}/register`;
    registerUrl.search = "";
    const res = NextResponse.redirect(registerUrl);
    res.cookies.delete(SESSION_COOKIE);
    res.cookies.delete(JOIN_REDIRECT_COOKIE);
    return res;
  }

  // Flow: room → /join/live → room (with fresh cookie) ✓
  // Loop guard: room → /join/live → room (no attendee cookie, _join_redirect set) → register
  if (hasRoomSuffix && t && webinarId) {
    // Loop guard: only block on alreadyTriedJoin when there is no session cookie.
    // With a cookie the user has a valid session so there is no loop risk —
    // let it through to /join/live to re-resolve and land on the correct session.
    if (alreadyTriedJoin && !hasCookie) {
      const registerUrl = nextUrl.clone();
      registerUrl.pathname = `/${webinarId}/register`;
      registerUrl.search = "";
      const res = NextResponse.redirect(registerUrl);
      res.cookies.delete(SESSION_COOKIE);
      res.cookies.delete(JOIN_REDIRECT_COOKIE);
      return res;
    }

    const joinUrl = nextUrl.clone();
    joinUrl.pathname = "/join/live";
    const res = NextResponse.redirect(joinUrl);
    res.cookies.delete(SESSION_COOKIE);
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
