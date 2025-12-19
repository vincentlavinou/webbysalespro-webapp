'use client';

import { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { StripeCheckoutForm } from './StripeCheckoutForm';
import { useAction } from 'next-safe-action/hooks';
import { startCheckout } from '@/offer-client/service/action';
import { notifyErrorUiMessage } from '@/lib/notify';
import { useOfferSessionClient } from '@/offer-client/hooks/use-offer-session-client';

function LoadingPaymentCard() {
  return (
    <div
      className={[
        'rounded-xl p-3',
        'bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75',
        'ring-1 ring-border/70 shadow-sm',
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">Payment</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Preparing secure checkout…
          </div>
        </div>

        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent text-muted-foreground"
          aria-hidden="true"
        />
      </div>

      <div className="mt-3 space-y-2">
        {/* faux PaymentElement skeleton */}
        <div className="rounded-lg border border-border bg-background/40 p-3">
          <div className="space-y-2">
            <div className="h-4 w-1/3 rounded-md bg-muted animate-pulse" />
            <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
            <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
          </div>
        </div>

        {/* CTA skeleton */}
        <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
        <div className="h-3 w-2/3 rounded-md bg-muted animate-pulse" />
      </div>
    </div>
  );
}

export function StripeCheckout() {
  const { email, token, sessionId, selectedOffer, handleCheckoutSuccess } =
    useOfferSessionClient();

  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const { execute: fetchCheckoutInfo } = useAction(startCheckout, {
    onSuccess: async ({ data }) => {
      setStripePromise(loadStripe(data.public_key));
      setClientSecret(data.client_secret);
    },
    onError: async ({ error: { serverError } }) => {
      notifyErrorUiMessage(serverError);
    },
  });

  useEffect(() => {
    if (!selectedOffer) return;

    fetchCheckoutInfo({
      sessionId,
      offerId: selectedOffer?.offer?.id,
      token,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOffer, token, sessionId]);

  if (!stripePromise || !clientSecret) {
    return <LoadingPaymentCard />;
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <StripeCheckoutForm token={token} email={email} onSuccess={handleCheckoutSuccess} />
    </Elements>
  );
}
