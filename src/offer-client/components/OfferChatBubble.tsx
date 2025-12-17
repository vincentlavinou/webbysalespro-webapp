// import { WebinarOffer } from "../service";
import { OfferCarousel } from "./OfferCarousel";
// import { SelectedOffer } from "./SelectedOffer";
// import { StripeCheckout } from "../checkout/stripe";
// import { getPaymentProviderLabel, PaymentProviderType } from "@/paymentprovider/service/enum";
// import { FanBasisCheckout } from "../checkout/fanbasis";
// import OfferPurchaseSuccess from "./OfferPurchaseSuccess";
import { useOfferSessionClient } from "../hooks/use-offer-session-client";
import { OfferView } from "../service/type";

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
                // return <SelectedOffer />
            case "offer-checkingout":
                // return <StripeCheckout />
            case "offer-purchased":
                // return <OfferPurchaseSuccess />
            default:
                return
        }
    }

    return (
        <>
            {getOfferView(view)}
        </>
    )
}