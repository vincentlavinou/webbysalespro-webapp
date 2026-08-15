'use client';

import { CheckoutProvider } from "@lavinou/webbysalespro/paymentprovider/checkout";
import { CalendlyCheckout as SharedCalendlyCheckout } from "@lavinou/webbysalespro/paymentprovider/checkout/calendly";

import { notifyErrorUiMessage } from "@/lib/notify";
import { useGuestCheckoutStart } from "../use-guest-checkout";
import { useOfferSessionClient } from "@/offer-client/hooks/use-offer-session-client";

export function CalendlyCheckout() {
  const {
    user,
    sessionId,
    selectedOffer,
    recordEvent,
    handleCheckoutSuccess,
    cancelCheckout,
    closeSheetAfterPurchase,
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
      onDone={closeSheetAfterPurchase}
      onCancel={cancelCheckout}
      notifyError={(message) => notifyErrorUiMessage(message)}
    >
      <SharedCalendlyCheckout />
    </CheckoutProvider>
  );
}
