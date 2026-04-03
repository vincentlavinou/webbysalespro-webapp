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

const webinarApiUrl =
  process.env.WEBINAR_BASE_API_URL ??
  process.env.NEXT_PUBLIC_WEBINAR_BASE_API_URL ??
  'https://api.webisalespro.com/api'

async function resolveWebinarIdFromSession(sessionId: string): Promise<string | null> {
  try {
    const res = await fetch(`${webinarApiUrl}/v1/sessions/${sessionId}/webinar/id/`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json() as { session_id: string; webinar_id: string }
    return data.webinar_id ?? null
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
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
    const joinUrl = nextUrl.clone();
    joinUrl.pathname = `/${webinarId}/general/join`;
    joinUrl.search = "";
    const res = NextResponse.redirect(joinUrl);
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
      const joinUrl = nextUrl.clone();
      joinUrl.pathname = `/${webinarId}/general/join`;
      joinUrl.search = "";
      const res = NextResponse.redirect(joinUrl);
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

  // Stale room URL: no cookie, no token, no webinar_id in the URL.
  // Resolve the webinar from the session ID so we can send the user to general/join.
  if (hasRoomSuffix && !hasCookie && !t && !webinarId) {
    const sessionId = nextUrl.pathname.split('/').filter(Boolean)[0]
    const resolvedWebinarId = await resolveWebinarIdFromSession(sessionId)
    const target = nextUrl.clone()
    target.search = ''
    target.pathname = resolvedWebinarId
      ? `/${resolvedWebinarId}/general/join`
      : '/webinar-not-found'
    return NextResponse.redirect(target)
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
