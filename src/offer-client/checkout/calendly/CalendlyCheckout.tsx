'use client';

import { useEffect, useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { CalendarCheck2, X } from 'lucide-react';
import { InlineWidget, useCalendlyEventListener } from 'react-calendly';
import { startCalendlyCheckout } from '@/offer-client/service/action';
import { notifyErrorUiMessage } from '@/lib/notify';
import { useOfferSessionClient } from '@/offer-client/hooks/use-offer-session-client';

function LoadingScheduleCard() {
  return (
    <div className="space-y-2 px-3 pb-3">
      <div className="rounded-lg border border-border bg-background/40 p-3">
        <div className="space-y-2">
          <div className="h-4 w-1/3 rounded-md bg-muted animate-pulse" />
          <div className="h-40 w-full rounded-md bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function CalendlyCheckout() {
  const { user, sessionId, selectedOffer, cancelCheckout, closeSheetAfterPurchase } =
    useOfferSessionClient();

  const [schedulingUrl, setSchedulingUrl] = useState<string | null>(null);
  const [isBooked, setIsBooked] = useState(false);

  const { execute: fetchSchedulingUrl } = useAction(startCalendlyCheckout, {
    onSuccess: async ({ data }) => {
      if (!data?.url) return;
      setSchedulingUrl(data.url);
    },
    onError: async ({ error: { serverError } }) => {
      notifyErrorUiMessage(serverError);
    },
  });

  useEffect(() => {
    if (!selectedOffer) return;

    fetchSchedulingUrl({
      sessionId,
      offerId: selectedOffer.offer.id,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOffer, sessionId]);

  useCalendlyEventListener({
    onEventScheduled: () => {
      setIsBooked(true);
    },
  });

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
          <h3 className="text-sm font-semibold text-foreground">Schedule a call</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pick a time that works for you.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold tracking-wider text-foreground">CALENDLY</span>
          <button
            type="button"
            aria-label="Close"
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
        {isBooked ? (
          <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
            <CalendarCheck2 className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
            <p className="text-sm font-semibold text-foreground">You&apos;re booked!</p>
            <p className="text-xs text-muted-foreground">
              A confirmation has been sent to {user.email}.
            </p>
            <button
              type="button"
              onClick={closeSheetAfterPurchase}
              className="mt-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Continue
            </button>
          </div>
        ) : !schedulingUrl ? (
          <LoadingScheduleCard />
        ) : (
          <div className="px-3 pb-3">
            <InlineWidget
              url={schedulingUrl}
              styles={{ height: '600px' }}
              prefill={{
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                name: [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
