'use client';

import { CheckoutProvider } from "@lavinou/webbysalespro/paymentprovider/checkout";
import { StripeCheckout as SharedStripeCheckout } from "@lavinou/webbysalespro/paymentprovider/checkout/stripe";

import { notifyErrorUiMessage } from "@/lib/notify";
import { useGuestCheckoutStart } from "../use-guest-checkout";
import { useOfferSessionClient } from "@/offer-client/hooks/use-offer-session-client";

export function StripeCheckout() {
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
      <SharedStripeCheckout />
    </CheckoutProvider>
  );
}
