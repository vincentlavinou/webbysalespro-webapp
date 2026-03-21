'use client';

import { useOfferSessionClient } from '@/offer-client/hooks/use-offer-session-client';
import { CreditCard, ExternalLink, X } from 'lucide-react';
import Image from 'next/image';

export function FanBasisCheckout() {
  const { token, selectedOffer, setIsCheckingOut, recordEvent } =
    useOfferSessionClient();

  const handleClose = async () => {
    await recordEvent('checkout_canceled', token);
    setIsCheckingOut(false);
  };

  const handleFinancingClick = async () => {
    if (!selectedOffer) return;
    const url = (selectedOffer.offer.action_payload as { url?: string })?.url;
    if (!url) return;
    await recordEvent('checkout_started', token);
    window.open(url, '_blank', 'noopener,noreferrer');
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

      {/* Options */}
      <div className="px-3 pb-3 space-y-2">
        <button
          type="button"
          disabled
          className="w-full flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3 text-left cursor-not-allowed"
        >
          <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-sm font-medium text-foreground">Credit/Debit Card</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Coming soon
          </span>
        </button>

        <button
          type="button"
          onClick={handleFinancingClick}
          className="w-full flex items-center gap-3 rounded-lg border border-border bg-background/40 hover:bg-accent/50 p-3 text-left transition-colors"
        >
          <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-sm font-medium text-foreground">More Financing Options</span>
        </button>
      </div>
    </div>
  );
}
