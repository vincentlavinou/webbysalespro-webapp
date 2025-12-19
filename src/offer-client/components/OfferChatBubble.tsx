'use client'
import { OfferCarousel } from "./OfferCarousel";
import { SelectedOffer } from "./SelectedOffer";
import { StripeCheckout } from "../checkout/stripe";
import { useOfferSessionClient } from "../hooks/use-offer-session-client";
import { OfferView } from "../service/type";
import OfferPurchaseSuccess from "./OfferPurchaseSuccess";

export function OfferChatBubble() {

    const {
        view,
        offers,
        setSelectedOffer
    } = useOfferSessionClient()


    const getOfferView = (view: OfferView) => {
        switch(view) {
            case "offers-hidden":
                return 
            case "offers-visible":
                return <OfferCarousel 
                    offers={offers}
                    onOfferClick={setSelectedOffer}
                    />
            case "offer-selected":
                return <SelectedOffer />
            case "offer-checkingout":
                return <StripeCheckout />
            case "offer-purchased":
                return <OfferPurchaseSuccess />
            default:
                return
        }
    }

    return (
        <div className="pb-2">
            {getOfferView(view)}
        </div>
    )
}