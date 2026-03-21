'use client'
import { OfferCarousel } from "./OfferCarousel";
import { SelectedOffer } from "./SelectedOffer";
import { StripeCheckout } from "../checkout/stripe";
import { FanBasisCheckout } from "../checkout/fanbasis";
import { useOfferSessionClient } from "../hooks/use-offer-session-client";
import { OfferView } from "../service/type";
import { PaymentProviderType } from "@/paymentprovider/service/enum";
import OfferPurchaseSuccess from "./OfferPurchaseSuccess";

export function OfferChatBubble() {

    const {
        view,
        offers,
        selectedOffer,
        handleOfferClick
    } = useOfferSessionClient()

    const visibleOffers = offers.filter(
        (os) => !["closed", "scheduled"].includes(os.status)
    )

    const getOfferView = (view: OfferView) => {
        switch(view) {
            case "offers-hidden":
                return
            case "offers-visible":
                // Guard: view and offers state update in two separate renders.
                // If the host closes all offers, `visibleOffers` can be empty
                // while `view` is still "offers-visible". Rendering OfferCarousel
                // with an empty array causes framer-motion to try exit-animating
                // an unmounted element, which crashes WebKit on iOS.
                if (visibleOffers.length === 0) return null;
                return <OfferCarousel
                    offers={visibleOffers}
                    onOfferClick={handleOfferClick}
                    />
            case "offer-selected":
                return <SelectedOffer />
            case "offer-checkingout":
                return selectedOffer?.offer.payment_provider === PaymentProviderType.FAN_BASIS
                    ? <FanBasisCheckout />
                    : <StripeCheckout />
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