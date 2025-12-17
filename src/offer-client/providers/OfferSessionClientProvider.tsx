import { useCallback, useEffect, useState } from "react";
import { OfferSessionClientContext } from "../contexts/OfferSessionClientContext"
import { OfferSessionDto, OfferView } from "../service/type";
import { usePlaybackMetadataEvent } from "@/emitter/playback";
import { offerVisibilityMetadataSchema } from "../service/schema";

interface OfferSessionClientProviderProps {
    children: React.ReactNode
    sessionId: string,
    token: string,
    initialOffers: OfferSessionDto[],
    email: string,
    recordEvent: (name: string, token: string, payload?: Record<string, unknown>) => Promise<void>
}

export function OfferSessionClientProvider({
    children,
    sessionId,
    token,
    initialOffers,
    email,
    recordEvent
}: OfferSessionClientProviderProps) {

    const [offers, setOffers] = useState(initialOffers)
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
            setOffers((prev) => {
                return prev.map((os) => os.id === event.payload.id ? { ...os, status: event.payload.status } : os)
            })
        }
    }, [])

    const isOffersVisibile = useCallback(() => {
        const hasVisibleOffer = offers.find((os) => os.status !== 'closed')

        if (hasVisibleOffer) return true

        return false
    }, [offers])

    useEffect(() => {

        const calculateView = () => {

            const hasVisibleOffer = offers.find((os) => os.status !== 'closed')
            const hasSelectedOffer = selectedOffer !== undefined
            const hasPurchasedOffer = purchasedOffer !== undefined

            if (hasPurchasedOffer) return "offer-purchased" as OfferView
            if (isCheckingOut) return "offer-checkingout" as OfferView
            if (hasSelectedOffer) return "offer-selected" as OfferView
            if (hasVisibleOffer) return "offers-visible" as OfferView

            return "offers-hidden" as OfferView

        }

        const updatedView = calculateView()
        setView(updatedView)

    }, [offers, selectedOffer, purchasedOffer, isCheckingOut, setView])


    const resetView = () => {
        setIsCheckingOut(false);
        setSelectedOffer(undefined);
        setPurchasedOffer(undefined)
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