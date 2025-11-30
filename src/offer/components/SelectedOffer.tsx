import { Button } from "@/components/ui/button";
import { useWebinar } from "@/webinar/hooks";
import { WebinarOffer } from "../service";
import { useEffect } from "react";

interface SelectedOfferProps {
  token: string
  selectedOffer: WebinarOffer;
  setIsCheckingOut: (value: boolean) => void;
  setSelectedOffer: (offer: WebinarOffer | undefined) => void;
}

export function SelectedOffer({
  token,
  selectedOffer,
  setIsCheckingOut,
  setSelectedOffer,
}: SelectedOfferProps) {
  const { recordEvent } = useWebinar();

  useEffect(() => {
    const load = async () => {
      await recordEvent("offer_shown", token, {
        offer_id: selectedOffer.id,
      });
    };
    load();
  }, [recordEvent, selectedOffer.id]);

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-foreground">
        {selectedOffer.headline}
      </h3>

      <p className="text-sm text-muted-foreground">
        {selectedOffer.description}
      </p>

      <p className="text-sm text-primary font-semibold">
        {selectedOffer.currency_display} {selectedOffer.price}
      </p>

      <Button
        className="mt-3 w-full"
        onClick={() => setIsCheckingOut(true)}
      >
        Buy Now
      </Button>

      <Button
        variant="ghost"
        className="mt-1 w-full text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
        onClick={() => setSelectedOffer(undefined)}
      >
        Close
      </Button>
    </div>
  );
}
