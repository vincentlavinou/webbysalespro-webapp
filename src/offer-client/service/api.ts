import "server-only";

import { createGuestApi } from "@lavinou/webbysalespro/networking/guest";
import { createOfferGuestApi } from "@lavinou/webbysalespro/offer/guest";

import { resolveJoin } from "@/attendee-session/service/resolve-join";
import { report } from "@/lib/error";
import { guestSessionStore } from "@/lib/guest-credentials";

/** The guest offer binding uses the app's cookie and join-link resolver. */
const guestApi = createGuestApi({
  store: guestSessionStore,
  resolveJoin,
  report,
});

export const offerGuestApi = createOfferGuestApi(guestApi);
