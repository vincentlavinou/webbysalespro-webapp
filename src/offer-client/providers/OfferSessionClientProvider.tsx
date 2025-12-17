import { useCallback, useState } from "react";
import { OfferSessionClientContext } from "../contexts/OfferSessionClientContext"
import { OfferSessionDto, OfferView } from "../service/type";
import { usePlaybackMetadataEvent } from "@/emitter/playback";
import { offerVisibilityMetadataSchema } from "../service/schema";

interface OfferSessionClientProviderProps {
    children: React.ReactNode
    sessionId: string,
    token: string,
    offers: OfferSessionDto[],
    email: string,
    recordEvent: (name: string, token: string, payload?: Record<string, unknown>) => Promise<void>
}

export function OfferSessionClientProvider({
    children,
    sessionId,
    token,
    offers,
    email,
    recordEvent
}: OfferSessionClientProviderProps) {

    const [selectedOffer, setSelectedOffer] = useState<OfferSessionDto | undefined>(undefined);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [view, setView] = useState<OfferView>("offers-hidden")
    // new: success state
    const [purchasedOffer, setPurchasedOffer] = useState<{
        offer: OfferSessionDto;
        ref: string;
    } | undefined>(undefined);

    usePlaybackMetadataEvent({
        eventType: "webinar:offer:visibility",
        sessionId: sessionId,
        schema: offerVisibilityMetadataSchema,
        onEvent: (event) => {
            console.log(event)
        }
    })

    const resetView = () => {
        setIsCheckingOut(false);
        setSelectedOffer(undefined);
        setView("offers-visible")
    };

    const handleCheckoutSuccess = useCallback(async (ref: string) => {
        if (selectedOffer && selectedOffer.offer.price) {
            setPurchasedOffer({ offer: selectedOffer, ref: ref });
            await recordEvent("purchase_succeeded", token, {
                "amount_cents": selectedOffer.offer.price.value * 100 // cents
            })
            setView("offer-purchased")
            resetView()
        }
    }, [selectedOffer]);


    return (
        <OfferSessionClientContext.Provider value={{
            sessionId,
            token,
            view,
            email,
            isPurchasingOffer: isCheckingOut,
            offers: offers,
            selectedOffer,
            purchasedOffer,
            setPurchasedOffer,
            setSelectedOffer,
            handleCheckoutSuccess,
            recordEvent,
        }}>
            {children}
        </OfferSessionClientContext.Provider>
    )
}