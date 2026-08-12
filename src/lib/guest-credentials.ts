import "server-only";

import {
  resolveBaseApiUrl,
  type Credentials,
} from "@lavinou/webbysalespro/networking";
import {
  createGuestCredentials,
  type GuestSession,
  type GuestSessionStore,
} from "@lavinou/webbysalespro/networking/guest";

import type { AttendeeSessionCookie } from "@/attendee-session/service/type";
import { resolveJoin } from "@/attendee-session/service/resolve-join";
import {
  clearAttendeeSessionCookie,
  getAttendeeSessionCookie,
  setAttendeeSessionCookie,
} from "./attendee-cookie";
import { report } from "./error";

/**
 * Binds this app's cookie to the shared join-session lifecycle.
 *
 * The lifecycle itself — proactive refresh inside the expiry buffer, coalescing
 * concurrent refreshes of the same token, and re-resolving the join link when
 * the backend answers JR-008/JR-009 — now lives in
 * `@lavinou/webbysalespro/networking/guest`. It encodes backend contracts, not
 * app decisions, which is why it moved.
 *
 * What stays here is only where the session is kept.
 */
const store: GuestSessionStore = {
  read: () => getAttendeeSessionCookie(),

  /**
   * The package always writes back a spread of the session it read, so the
   * fields it does not model — `webinarId`, `attendanceId`, `sessionId` — are
   * carried through untouched. The cast reflects that: at runtime this is
   * always a full cookie, but the package's type only promises the subset it
   * actually uses.
   */
  write: (session: GuestSession) =>
    setAttendeeSessionCookie(session as AttendeeSessionCookie),

  clear: () => clearAttendeeSessionCookie(),
};

let cached: Credentials | undefined;

/**
 * Built lazily rather than at module scope: `resolveBaseApiUrl()` throws when no
 * API URL is configured, and that should surface on the first request instead of
 * crashing at import time.
 */
export function guestCredentials(): Credentials {
  if (!cached) {
    cached = createGuestCredentials({
      baseUrl: resolveBaseApiUrl(),
      store,
      // Reuses this app's resolver, which adds request-scoped caching and the
      // debug instrumentation the package's built-in one does not have.
      resolveJoin,
      report,
    });
  }

  return cached;
}
