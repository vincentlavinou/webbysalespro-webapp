import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const CANONICAL_HOST = "events.webbysalespro.com";
const NETLIFY_HOST_SUFFIXES = [".netlify.app", ".netlify.com"];

// Room paths that may receive a join token directly (e.g. from email links or backend-generated URLs).
const ROOM_PATH_SUFFIXES = ["/live", "/waiting-room", "/early-access-room"];

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
  const t = nextUrl.searchParams.get("t");
  const webinarId = nextUrl.searchParams.get("webinar_id");
  const hasRoomSuffix = ROOM_PATH_SUFFIXES.some((s) => nextUrl.pathname.endsWith(s));
  const hasCookie = request.cookies.has("attendee_session");

  if (t && webinarId && hasRoomSuffix && !hasCookie) {
    const joinUrl = nextUrl.clone();
    joinUrl.pathname = "/join/live";
    return NextResponse.redirect(joinUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|ivs/).*)",
  ],
};
