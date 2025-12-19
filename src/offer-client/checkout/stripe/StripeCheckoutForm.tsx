'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOfferSessionClient } from '@/offer-client/hooks/use-offer-session-client';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface StripeCheckoutFormProps {
  email: string;
  token: string;
  onSuccess: (paymentIntentId: string) => void;
}

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  );
}

export function StripeCheckoutForm({ email, token, onSuccess }: StripeCheckoutFormProps) {
  const { recordEvent, setIsCheckingOut } = useOfferSessionClient();
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    await recordEvent('checkout_started', token);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        payment_method_data: {
          billing_details: { email },
        },
      },
      redirect: 'if_required',
    });

    if (error) {
      toast.error(`${error.message ?? 'Payment failed.'}`);
      if (error.code === 'card_declined') {
        await recordEvent(error.decline_code || 'generic_decline', token);
      }
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    } else {
      toast.error('Payment processing or requires action.');
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="h-full min-h-0">
      <Card
        className="
          relative h-full min-h-0
          overflow-hidden
          bg-card/90 supports-[backdrop-filter]:bg-card/75 backdrop-blur
          ring-1 ring-border/70 shadow-sm
        "
      >
        {/* Header (fixed) */}
        <div className="relative border-b border-border/60 px-3 py-3">
          <button
            type="button"
            aria-label="Close checkout"
            disabled={loading}
            onClick={() => setIsCheckingOut(false)}
            className="
              absolute right-2 top-2
              inline-flex h-8 w-8 items-center justify-center rounded-md
              text-muted-foreground hover:text-foreground hover:bg-accent
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <X className="h-4 w-4" />
          </button>

          <h3 className="text-sm font-semibold text-foreground">Payment</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Secure checkout powered by Stripe.
          </p>
        </div>

        {/* Body (scrolls) */}
        <div className="flex h-full min-h-0 flex-col">
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-3">
              <div className="rounded-lg border border-border bg-background/40 p-3">
                <PaymentElement />
              </div>
            </div>
          </ScrollArea>

          {/* Footer (fixed) */}
          <div className="border-t border-border/60 p-3 space-y-2">
            <Button type="submit" disabled={!stripe || loading} className="w-full">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner />
                  Processing…
                </span>
              ) : (
                'Pay Now'
              )}
            </Button>

            <p className="text-[11px] text-muted-foreground">
              Your payment details are encrypted and never stored on our servers.
            </p>
          </div>
        </div>
      </Card>
    </form>
  );
}
