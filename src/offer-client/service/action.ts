"use server";

import { createOfferGuestActions } from "@lavinou/webbysalespro/offer/guest";

import { actionClient } from "@/lib/safe-action";
import { offerGuestApi } from "./api";

/** App-owned server-action declarations backed by the shared guest binding. */
const actions = createOfferGuestActions({
  actionClient,
  api: offerGuestApi,
});

export const getOfferSessionsForAttendee = actions.listSessionOffers;
export const startCheckout = actions.startCheckout;
