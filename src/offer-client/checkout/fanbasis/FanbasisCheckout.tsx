'use client';

import { useOfferSessionClient } from '@/offer-client/hooks/use-offer-session-client';
import type { FanbasisCheckoutDto } from '@/offer-client/service/type';
import { AutoCheckout, CheckoutProvider } from '@fanbasis/checkout-react';
import type { CheckoutSuccessData } from '@fanbasis/checkout-react';
import { ArrowLeft, CreditCard, ExternalLink, Loader2, X } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

export function FanBasisCheckout() {
  const { token, selectedOffer, setIsCheckingOut, recordEvent, handleCheckoutSuccess } =
    useOfferSessionClient();

  const [financing, setFinancing] = useState(false);
  const [cardMode, setCardMode] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const payload = (selectedOffer?.offer.action_payload ?? {}) as FanbasisCheckoutDto;
  const isProduction = selectedOffer?.offer.is_production ?? false;

  const canUseCardCheckout =
    !!payload.fanbasis_creator_id &&
    !!payload.fanbasis_product_id &&
    !!payload.checkout_session_secret;

  const checkoutConfig = canUseCardCheckout
    ? {
        creatorId: payload.fanbasis_creator_id!,
        productId: payload.fanbasis_product_id!,
        checkoutSessionSecret: payload.checkout_session_secret!,
        environment: isProduction ? ('production' as const) : ('sandbox' as const),
      }
    : null;

  const handleClose = async () => {
    await recordEvent('checkout_canceled', token);
    setIsCheckingOut(false);
  };

  const handleCardClick = () => {
    setCardError(null);
    setCardMode(true);
    recordEvent('checkout_started', token);
  };

  const handleCardBack = () => {
    setCardMode(false);
    setCardError(null);
  };

  const handleCardSuccess = (data: CheckoutSuccessData) => {
    handleCheckoutSuccess(data.transactionId);
  };

  const handleCardError = (error: Error) => {
    console.error('FanBasis card checkout error:', error);
    setCardError('Payment failed. Please try again.');
  };

  const handleFinancingClick = () => {
    if (!selectedOffer || financing) return;
    const url = payload.url;
    if (!url) return;
    setFinancing(true);
    window.open(url, '_blank', 'noopener,noreferrer');
    recordEvent('checkout_started', token);
    setTimeout(() => setFinancing(false), 4000);
  };

  return (
    <div
      className={[
        'rounded-xl',
        'bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75',
        'ring-1 ring-border/70 shadow-sm',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-3 pt-3 pb-2">
        <div>
          {cardMode ? (
            <button
              type="button"
              onClick={handleCardBack}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-foreground">Payment</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Secure checkout powered by FanBasis.
              </p>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Image src="/fanbasis_logo.png" alt="" width={16} height={16} />
          <span className="text-[10px] font-bold tracking-wider text-foreground">FANBASIS</span>
          <button
            type="button"
            aria-label="Close checkout"
            onClick={handleClose}
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

      {/* Inline card checkout */}
      {cardMode && checkoutConfig ? (
        <div className="px-3 pb-3">
          {cardError && (
            <p className="mb-2 text-xs text-destructive">{cardError}</p>
          )}
          <CheckoutProvider config={checkoutConfig}>
            <AutoCheckout
              autoOpen
              onSuccess={handleCardSuccess}
              onError={handleCardError}
              containerOptions={{ width: '100%', height: '480px' }}
            />
          </CheckoutProvider>
        </div>
      ) : (
        /* Payment options */
        <div className="px-3 pb-3 space-y-2">
          <button
            type="button"
            onClick={handleCardClick}
            disabled={!canUseCardCheckout}
            className="w-full flex items-center gap-3 rounded-lg border border-border bg-background/40 hover:bg-accent/50 p-3 text-left transition-colors disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium text-foreground">Credit/Debit Card</span>
            {!canUseCardCheckout && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Coming soon
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleFinancingClick}
            disabled={financing}
            className="w-full flex items-center gap-3 rounded-lg border border-border bg-background/40 hover:bg-accent/50 p-3 text-left transition-colors disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {financing ? (
              <Loader2 className="h-4 w-4 shrink-0 text-muted-foreground animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="flex-1 text-sm font-medium text-foreground">
              {financing ? 'Opening…' : 'More Financing Options'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
