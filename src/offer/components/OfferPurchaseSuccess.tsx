// app/(wherever)/webinar/offer/components/OfferPurchaseSuccess.tsx
import { CheckCircle2, Mail, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import type { WebinarOffer } from "../service";

type Props = {
  offer: WebinarOffer;
  email: string;
  paymentReference?: string;    // e.g. Stripe paymentIntent id
  onClose?: () => void;         // close the bubble / collapse success view
  onViewReceipt?: () => void;   // optional: open a receipt link if you have one
  className?: string;
};

export default function OfferPurchaseSuccess({
  offer,
  email,
  paymentReference,
  onClose,
  onViewReceipt,
  className,
}: Props) {

  const priceLabel = useMemo(() => {
    try {
      const num = Number(offer.price);
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: offer.currency,
      }).format(num);
    } catch {
      return `${offer.currency} ${offer.price}`;
    }
  }, [offer.price, offer.currency]);

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-background p-4 shadow-sm",
        "animate-in fade-in slide-in-from-bottom-2 duration-300",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <CheckCircle2
          className="h-6 w-6 text-emerald-500 dark:text-emerald-400"
          aria-hidden
        />

        <div className="flex-1">
          <h3 className="text-sm font-semibold leading-tight text-foreground">
            Payment successful
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            You’ve unlocked{" "}
            <span className="font-medium">{offer.headline}</span>.
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 -mr-1 -mt-1 text-muted-foreground hover:text-foreground hover:bg-accent"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary */}
      <div className="mt-3 rounded-md bg-secondary/40 p-3">
        <div className="flex items-center gap-2 text-xs">
          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">
            {offer.headline}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-foreground">{priceLabel}</span>
        </div>
        {paymentReference && (
          <div className="mt-1 text-[11px] text-muted-foreground">
            Ref: <span className="font-mono">{paymentReference}</span>
          </div>
        )}
      </div>

      {/* Next steps */}
      <div className="mt-3 grid gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground">
            We’ve sent a confirmation to{" "}
            <span className="font-medium">{email}</span>.
          </span>
        </div>
        <p className="text-muted-foreground">
          Your access details are in the email. You can keep watching the
          webinar—no further action needed.
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        {onViewReceipt && (
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={onViewReceipt}
          >
            View receipt
          </Button>
        )}
        <Button
          className="w-full sm:w-auto"
          onClick={onClose}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
