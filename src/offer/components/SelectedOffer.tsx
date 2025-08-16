import { Button } from "@/components/ui/button";
import { useWebinar } from "@/webinar/hooks";
import { WebinarOffer } from "../service";
import { useEffect } from "react";

interface SelectedOfferProps {
    selectedOffer: WebinarOffer,
    setIsCheckingOut: (value: boolean) => void,
    setSelectedOffer: (offer: WebinarOffer | undefined) => void
}

export function SelectedOffer({
    selectedOffer,
    setIsCheckingOut,
    setSelectedOffer
} : SelectedOfferProps) {

    const {recordEvent} = useWebinar()

    useEffect(() => {
        const load = async () => {
            await recordEvent("offer_shown")
        }
        load()
    }, [])

    return (
        <>
            <h3 className="font-semibold">{selectedOffer.headline}</h3>
            <p className="text-sm text-muted-foreground mt-1">{selectedOffer.description}</p>
            <p className="text-sm text-primary mt-2">
                {selectedOffer.currency_display} {selectedOffer.price}
            </p>
            <Button className="mt-3 w-full" onClick={() => setIsCheckingOut(true)}>Buy Now</Button>
            <Button variant="ghost" className="mt-1 w-full text-xs" onClick={() => setSelectedOffer(undefined)}>
            Close
            </Button>
        </>
    )
}