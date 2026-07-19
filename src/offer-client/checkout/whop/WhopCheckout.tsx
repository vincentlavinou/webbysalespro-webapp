'use client';

import { useOfferSessionClient } from '@/offer-client/hooks/use-offer-session-client';
import { startWhopCheckout } from '@/offer-client/service/action';
import type { WhopCheckoutDto } from '@/offer-client/service/type';
import { notifyErrorUiMessage } from '@/lib/notify';
import { WhopCheckoutEmbed } from '@whop/checkout/react';
import type { WhopCheckoutPaymentError, WhopCheckoutState } from '@whop/checkout/util';
import { X } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useMemo, useState } from 'react';

function LoadingPaymentCard() {
  return (
    <div className="space-y-2 px-3 pb-3">
      <div className="rounded-lg border border-border bg-background/40 p-3">
        <div className="space-y-2">
          <div className="h-4 w-1/3 rounded-md bg-muted animate-pulse" />
          <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
          <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
        </div>
      </div>
      <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
    </div>
  );
}

export function WhopCheckout() {
  const { user, sessionId, selectedOffer, recordEvent, handleCheckoutSuccess, cancelCheckout } =
    useOfferSessionClient();

  const { resolvedTheme } = useTheme();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutState, setCheckoutState] = useState<WhopCheckoutState>('loading');
  const [whopSessionId, setWhopSessionId] = useState<string | null>(null);

  const payload = (selectedOffer?.offer.action_payload ?? {}) as WhopCheckoutDto;
  const isProduction = selectedOffer?.offer.is_production ?? false;
  const planId = payload.whop_plan_id;
  const canUseCheckout = !!planId;

  const returnUrl = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    return selectedOffer?.offer.post_purchase_config?.redirect_url ?? window.location.href;
  }, [selectedOffer]);

  const { execute: fetchCheckoutSession } = useAction(startWhopCheckout, {
    onSuccess: async ({ data }) => {
      if (!data?.session_id) return;
      setWhopSessionId(data.session_id);
    },
    onError: async ({ error: { serverError } }) => {
      notifyErrorUiMessage(serverError);
      setCheckoutError('Could not start checkout. Please try again.');
    },
  });

  useEffect(() => {
    if (!canUseCheckout || !selectedOffer) return;
    void recordEvent('checkout_started');
    setWhopSessionId(null);
    // The checkout session carries attendance_id metadata (needed for Whop
    // webhook attribution) — a bare planId checkout has no metadata attached.
    fetchCheckoutSession({ sessionId, offerId: selectedOffer.offer.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseCheckout, selectedOffer?.id]);

  const handleComplete = useCallback((idArg: string, receiptOrSetupIntentId?: string) => {
    handleCheckoutSuccess(receiptOrSetupIntentId ?? idArg);
  }, [handleCheckoutSuccess]);

  const handlePaymentError = useCallback((error: WhopCheckoutPaymentError) => {
    // Whop's backend webhooks are the source of truth for failed payments,
    // so we only surface the error in the UI here and skip recordEvent to
    // avoid double-processing/racing the webhook-driven failure handling.
    console.error('Whop checkout error:', error);
    setCheckoutError(error.message || 'Payment failed. Please try again.');
  }, []);

  return (
    <div
      className={[
        'rounded-xl',
        'bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75',
        'ring-1 ring-border/70 shadow-sm',
        'flex flex-col h-full',
      ].join(' ')}
    >
      {/* Header — sticky, never scrolls away */}
      <div className="sticky top-0 z-10 flex-none flex items-start justify-between px-3 pt-3 pb-2 bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75 rounded-t-xl">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Payment</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Secure checkout powered by Whop.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold tracking-wider text-foreground">WHOP</span>
          <button
            type="button"
            aria-label="Close checkout"
            onClick={() => void cancelCheckout()}
            className="
              inline-flex h-8 w-8 items-center justify-center rounded-md
              text-muted-foreground hover:text-foreground hover:bg-accent
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
            "
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {!canUseCheckout ? (
          <div className="px-3 pb-3">
            <p className="text-xs text-destructive">
              This offer isn&apos;t configured for checkout yet.
            </p>
          </div>
        ) : (
          <div className="px-3 pb-3">
            {checkoutError && (
              <p className="mb-2 text-xs text-destructive">{checkoutError}</p>
            )}
            {!whopSessionId || checkoutState === 'loading' ? <LoadingPaymentCard /> : null}
            {whopSessionId && (
              <div className={checkoutState === 'loading' ? 'hidden' : undefined}>
                <WhopCheckoutEmbed
                  sessionId={whopSessionId}
                  environment={isProduction ? 'production' : 'sandbox'}
                  theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                  skipRedirect
                  returnUrl={returnUrl}
                  fallback={<LoadingPaymentCard />}
                  collectPhoneNumbers
                  prefill={{
                    email: user.email,
                    ...(user.first_name || user.last_name
                      ? { address: { name: [user.first_name, user.last_name].filter(Boolean).join(' ') } }
                      : {}),
                  }}
                  onStateChange={setCheckoutState}
                  onComplete={handleComplete}
                  onPaymentError={handlePaymentError}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
