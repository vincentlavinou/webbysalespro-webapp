'use client'
import { CheckCircle2, Mail, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { useOfferSessionClient } from "../hooks/use-offer-session-client";

type Props = {
  className?: string;
};

export default function OfferPurchaseSuccess({
  className,
}: Props) {

  const {
    purchasedOffer,
    email,
    closeSheetAfterPurchase
  } = useOfferSessionClient()

  const priceLabel = useMemo(() => {
    const offer = purchasedOffer?.offer?.offer
    try {
      const num = Number(offer?.price?.effective_price);
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: offer?.price?.currency,
      }).format(num);
    } catch {
      return `${offer?.price?.currency} ${offer?.price}`;
    }
  }, [purchasedOffer]);

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
            <span className="font-medium">{purchasedOffer?.offer?.offer?.name}</span>.
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 -mr-1 -mt-1 text-muted-foreground hover:text-foreground hover:bg-accent"
          onClick={closeSheetAfterPurchase}
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
            {purchasedOffer?.offer.offer?.name}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-foreground">{priceLabel}</span>
        </div>
        {purchasedOffer?.ref && (
          <div className="mt-1 text-[11px] text-muted-foreground">
            Ref: <span className="font-mono">{purchasedOffer.ref}</span>
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
        <Button
          className="w-full sm:w-auto"
          onClick={closeSheetAfterPurchase}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
