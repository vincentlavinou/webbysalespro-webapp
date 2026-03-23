'use client'
import { StripeCheckout } from "../checkout/stripe";
import { FanBasisCheckout } from "../checkout/fanbasis";
import { useOfferSessionClient } from "../hooks/use-offer-session-client";
import { PaymentProviderType } from "@/paymentprovider/service/enum";
import OfferPurchaseSuccess from "./OfferPurchaseSuccess";

export function OfferChatBubble() {
    const { view, selectedOffer } = useOfferSessionClient();

    if (view === 'offer-checkingout') {
        return (
            <div className="pb-2">
                {selectedOffer?.offer.payment_provider === PaymentProviderType.FAN_BASIS
                    ? <FanBasisCheckout />
                    : <StripeCheckout />}
            </div>
        );
    }

    if (view === 'offer-purchased') {
        return (
            <div className="pb-2">
                <OfferPurchaseSuccess />
            </div>
        );
    }

    return null;
}