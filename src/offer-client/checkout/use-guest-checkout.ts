'use client';

import { useCallback } from "react";
import { useAction } from "next-safe-action/hooks";

import { startCheckout } from "@/offer-client/service/action";
import { useOfferSessionClient } from "@/offer-client/hooks/use-offer-session-client";

/** Adapts the app's server action to the shared checkout context contract. */
export function useGuestCheckoutStart() {
  const { sessionId, selectedOffer } = useOfferSessionClient();
  const { executeAsync } = useAction(startCheckout);

  return useCallback(
    async <TCheckout,>(): Promise<TCheckout> => {
      if (!selectedOffer) throw new Error("No offer selected.");

      const result = await executeAsync({
        sessionId,
        offerId: selectedOffer.offer.id,
      });

      if (!result?.data) {
        throw new Error(result?.serverError?.detail ?? "Could not start checkout.");
      }

      return result.data as TCheckout;
    },
    [executeAsync, selectedOffer, sessionId],
  );
}
