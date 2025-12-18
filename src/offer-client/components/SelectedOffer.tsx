import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useOfferSessionClient } from "../hooks/use-offer-session-client";


export function SelectedOffer() {
  const { token, selectedOffer, recordEvent, setIsCheckingOut, setSelectedOffer} = useOfferSessionClient();

  useEffect(() => {
    const load = async () => {
      await recordEvent("offer_shown", token, {
        offer_id: selectedOffer?.id,
      });
    };
    load();
  }, [recordEvent, selectedOffer?.id]);

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-foreground">
        {selectedOffer?.offer?.name}
      </h3>

      <p className="text-sm text-muted-foreground">
        {selectedOffer?.offer?.description}
      </p>

      <p className="text-sm text-primary font-semibold">
        {selectedOffer?.offer.price?.currency} {selectedOffer?.offer.price?.effective_price}
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
