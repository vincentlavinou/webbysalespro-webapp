import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const CANONICAL_HOST = "events.webbysalespro.com";
const NETLIFY_HOST_SUFFIXES = [".netlify.app", ".netlify.com"];

// Room paths that may receive a join token directly (e.g. from email links or backend-generated URLs).
const ROOM_PATH_SUFFIXES = ["/live", "/waiting-room", "/early-access-room", "/completed"];
const SESSION_COOKIE = "attendee_session";

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

  if (hasRoomSuffix && t && webinarId && !hasCookie) {
    const joinUrl = nextUrl.clone();
    joinUrl.pathname = "/join/live";
    return NextResponse.redirect(joinUrl);
  }

  const res = NextResponse.next()
  res.headers.set('x-pathname', nextUrl.pathname)
  if (t) res.headers.set('x-join-token', t)
  if (webinarId) res.headers.set('x-webinar-id', webinarId)
  return res
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|ivs/).*)",
  ],
};
