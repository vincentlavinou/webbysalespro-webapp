'use client';

import { useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { startFanbasisCheckout } from '@/offer-client/service/action';
import { notifyErrorUiMessage } from '@/lib/notify';
import { useOfferSessionClient } from '@/offer-client/hooks/use-offer-session-client';
import { Button } from '@/components/ui/button';
import { CreditCard, ExternalLink, X } from 'lucide-react';
import Image from 'next/image';

type CheckoutOption = 'card' | 'financing';

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

export function FanBasisCheckout() {
  const { token, sessionId, selectedOffer, setIsCheckingOut, recordEvent } =
    useOfferSessionClient();
  const [selected, setSelected] = useState<CheckoutOption | null>(null);
  const [loading, setLoading] = useState(false);

  const { executeAsync: fetchCheckoutUrl } = useAction(startFanbasisCheckout);

  const handleClose = async () => {
    await recordEvent('checkout_canceled', token);
    setIsCheckingOut(false);
  };

  const handlePayNow = async () => {
    if (!selected || selected === 'card' || !selectedOffer) return;

    setLoading(true);
    await recordEvent('checkout_started', token);

    const result = await fetchCheckoutUrl({
      sessionId,
      offerId: selectedOffer.offer.id,
      token,
    });

    if (result?.data?.checkout_url) {
      window.open(result.data.checkout_url, '_blank', 'noopener,noreferrer');
    } else {
      notifyErrorUiMessage(result?.serverError);
    }

    setLoading(false);
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
          <h3 className="text-sm font-semibold text-foreground">Payment</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Secure checkout powered by FanBasis.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Image src="/fanbasis_logo.png" alt="" width={16} height={16} />
          <span className="text-[10px] font-bold tracking-wider text-foreground">FANBASIS</span>
          <button
            type="button"
            aria-label="Close checkout"
            disabled={loading}
            onClick={handleClose}
            className="
              inline-flex h-8 w-8 items-center justify-center rounded-md
              text-muted-foreground hover:text-foreground hover:bg-accent
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Options */}
      <div className="px-3 pb-2 space-y-2">
        <button
          type="button"
          onClick={() => setSelected('card')}
          disabled={loading}
          className={[
            'w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
            'disabled:cursor-not-allowed',
            selected === 'card'
              ? 'border-primary bg-primary/5'
              : 'border-border bg-background/40 hover:bg-accent/50',
          ].join(' ')}
        >
          <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-sm font-medium text-foreground">Card</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Coming soon
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelected('financing')}
          disabled={loading}
          className={[
            'w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
            'disabled:cursor-not-allowed',
            selected === 'financing'
              ? 'border-primary bg-primary/5'
              : 'border-border bg-background/40 hover:bg-accent/50',
          ].join(' ')}
        >
          <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-sm font-medium text-foreground">More Financing Options</span>
        </button>
      </div>

      {/* Footer */}
      <div className="px-3 pb-3 pt-0">
        <Button
          type="button"
          disabled={!selected || selected === 'card' || loading}
          onClick={handlePayNow}
          className="w-full"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner />
              Processing…
            </span>
          ) : (
            'Pay Now'
          )}
        </Button>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Your payment details are encrypted and never stored on our servers.
        </p>
      </div>
    </div>
  );
}
