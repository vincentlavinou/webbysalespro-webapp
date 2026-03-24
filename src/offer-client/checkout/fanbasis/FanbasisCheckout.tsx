'use client';

import { useOfferSessionClient } from '@/offer-client/hooks/use-offer-session-client';
import type { FanbasisCheckoutDto } from '@/offer-client/service/type';
import { AutoCheckout, CheckoutConfig, CheckoutProvider, PaymentError } from '@fanbasis/checkout-react';
import { ArrowLeft, CreditCard, ExternalLink, Loader2, X } from 'lucide-react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { memo, useCallback, useMemo, useState } from 'react';

// Pattern-match the human-readable message Fanbasis passes to onError.
// The SDK's PaymentErrorCode enum only has config errors (UNKNOWN_ERROR etc.)
// so there are no structured decline codes to key off — message is all we have.
// If you find that `details` on the error carries richer info, extend this.
const FANBASIS_MESSAGE_PATTERNS: Array<{ pattern: RegExp; event: string }> = [
  { pattern: /insufficient funds/i,                 event: 'insufficient_funds' },
  { pattern: /contact your (card )?issuer/i,         event: 'stolen_card' },
  { pattern: /repeated attempts|too many attempts/i, event: 'card_velocity_exceeded' },
];

function parseFanbasisErrorEvent(message: string): string {
  for (const { pattern, event } of FANBASIS_MESSAGE_PATTERNS) {
    if (pattern.test(message)) return event;
  }
  return 'generic_decline';
}

interface FanbasisCardCheckoutProps {
  cardError: string | null;
  checkoutConfig: CheckoutConfig;
  onSuccess: (data: {transactionId: string}) => void;
  onError: (error: Error) => void;
}

const FanbasisCardCheckout = memo(function FanbasisCardCheckout({
  cardError,
  checkoutConfig,
  onSuccess,
  onError,
}: FanbasisCardCheckoutProps) {
  return (
    <div className="px-3 pb-3">
      {cardError && (
        <p className="mb-2 text-xs text-destructive">{cardError}</p>
      )}
      <CheckoutProvider config={checkoutConfig}>
        <AutoCheckout onSuccess={onSuccess} onError={onError} />
      </CheckoutProvider>
    </div>
  );
});

export function FanBasisCheckout() {
  const { token, selectedOffer, recordEvent, handleCheckoutSuccess, cancelCheckout } =
    useOfferSessionClient();

  const { resolvedTheme } = useTheme();
  const [financing, setFinancing] = useState(false);
  const [cardMode, setCardMode] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const payload = (selectedOffer?.offer.action_payload ?? {}) as FanbasisCheckoutDto;
  const isProduction = selectedOffer?.offer.is_production ?? false;
  const accentColor = selectedOffer?.offer.display?.accent_color?.trim() ?? '';

  const canUseCardCheckout =
    !!payload.fanbasis_creator_id &&
    !!payload.fanbasis_product_id &&
    !!payload.checkout_session_secret;

  const checkoutConfig = useMemo(() => {
    if (!canUseCardCheckout) return null;

    return {
      creatorId: payload.fanbasis_creator_id!,
      productId: payload.fanbasis_product_id!,
      checkoutSessionSecret: payload.checkout_session_secret!,
      environment: isProduction ? ('production' as const) : ('sandbox' as const),
      containerOptions: {
        width: '100%',
        height: '480px',
      },
      theme: {
        theme: (resolvedTheme === 'dark' ? 'dark' : 'light') as 'light' | 'dark',
        show_product_info: false,
        product_layout: 'above' as const,
        show_coupon_row: false,
        ...(accentColor ? { accent_color: accentColor } : {}),
      },
    } as CheckoutConfig;
  }, [
    accentColor,
    canUseCardCheckout,
    isProduction,
    payload.checkout_session_secret,
    payload.fanbasis_creator_id,
    payload.fanbasis_product_id,
    resolvedTheme,
  ]);

  const handleClose = cancelCheckout;

  const handleCardClick = useCallback(() => {
    setCardError(null);
    setCardMode(true);
    void recordEvent('checkout_started', token);
  }, [recordEvent, token]);

  const handleCardBack = useCallback(() => {
    setCardMode(false);
    setCardError(null);
  }, []);

  const handleCardSuccess = useCallback((data: {transactionId: string}) => {
    handleCheckoutSuccess(data.transactionId);
  }, [handleCheckoutSuccess]);

  const handleCardError = useCallback(async (error: Error) => {
    // TODO: remove once we know the real error shape from Fanbasis
    const fbError = error instanceof PaymentError ? error : null;
    console.error('FanBasis card checkout error:', {
      message: error?.message,
      code: fbError?.code,
      details: fbError?.details,
      raw: error,
    });
    setCardError('Payment failed. Please try again.');
    const eventName = parseFanbasisErrorEvent(error?.message ?? '');
    try {
      await recordEvent(eventName, token);
    } catch (e) {
      console.error('Failed to record card error event:', e);
    }
  }, [recordEvent, token]);

  const handleFinancingClick = useCallback(() => {
    if (!selectedOffer || financing) return;
    const url = payload.url;
    if (!url) return;
    setFinancing(true);
    window.open(url, '_blank', 'noopener,noreferrer');
    void recordEvent('checkout_started', token);
    setTimeout(() => setFinancing(false), 4000);
  }, [financing, payload.url, recordEvent, selectedOffer, token]);

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
      <div className="flex-none flex items-start justify-between px-3 pt-3 pb-2">
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

      {/* Scrollable body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
      {/* Inline card checkout */}
      {cardMode && checkoutConfig ? (
        <FanbasisCardCheckout
          cardError={cardError}
          checkoutConfig={checkoutConfig}
          onSuccess={handleCardSuccess}
          onError={handleCardError}
        />
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
    </div>
  );
}
