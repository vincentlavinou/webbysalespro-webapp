'use client';

import { CheckoutProvider } from "@lavinou/webbysalespro/paymentprovider/checkout";
import { FanbasisCheckout as SharedFanbasisCheckout } from "@lavinou/webbysalespro/paymentprovider/checkout/fanbasis";

import { notifyErrorUiMessage } from "@/lib/notify";
import { useGuestCheckoutStart } from "../use-guest-checkout";
import { useOfferSessionClient } from "@/offer-client/hooks/use-offer-session-client";

export function FanBasisCheckout() {
  const {
    user,
    sessionId,
    selectedOffer,
    recordEvent,
    handleCheckoutSuccess,
    cancelCheckout,
  } = useOfferSessionClient();
  const startCheckout = useGuestCheckoutStart();

  if (!selectedOffer) return null;

  return (
    <CheckoutProvider
      user={user}
      sessionId={sessionId}
      offer={selectedOffer.offer}
      startCheckout={startCheckout}
      recordEvent={recordEvent}
      onSuccess={handleCheckoutSuccess}
      onCancel={cancelCheckout}
      notifyError={(message) => notifyErrorUiMessage(message)}
    >
      <SharedFanbasisCheckout />
    </CheckoutProvider>
  );
}
