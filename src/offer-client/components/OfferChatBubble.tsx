'use client'
import { X } from "lucide-react";
import { StripeCheckout } from "../checkout/stripe";
import { FanBasisCheckout } from "../checkout/fanbasis";
import { useOfferSessionClient } from "../hooks/use-offer-session-client";
import { getPaymentProviderLabel, PaymentProviderType } from "@/paymentprovider/service/enum";
import OfferPurchaseSuccess from "./OfferPurchaseSuccess";

function UnsupportedProviderCheckout({ provider }: { provider: PaymentProviderType | null }) {
    const { cancelCheckout } = useOfferSessionClient();

    return (
        <div
            className={[
                'rounded-xl p-3',
                'bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75',
                'ring-1 ring-border/70 shadow-sm',
            ].join(' ')}
        >
            <div className="flex items-start justify-between gap-2">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Payment unavailable</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {provider
                            ? `Checkout via ${getPaymentProviderLabel(provider)} isn't supported yet. Please try again later.`
                            : "This offer isn't configured with a payment method yet."}
                    </p>
                </div>
                <button
                    type="button"
                    aria-label="Close checkout"
                    onClick={() => void cancelCheckout()}
                    className="
                        inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md
                        text-muted-foreground hover:text-foreground hover:bg-accent
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                    "
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

function renderCheckout(provider: PaymentProviderType | null) {
    switch (provider) {
        case PaymentProviderType.STRIPE:
            return <StripeCheckout />;
        case PaymentProviderType.FAN_BASIS:
            return <FanBasisCheckout />;
        case PaymentProviderType.PAYPAL:
        case PaymentProviderType.WHOP:
        case PaymentProviderType.CALENDLY:
        case null:
            return <UnsupportedProviderCheckout provider={provider} />;
        default:
            return <UnsupportedProviderCheckout provider={provider} />;
    }
}

export function OfferChatBubble() {
    const { view, selectedOffer } = useOfferSessionClient();

    if (view === 'offer-checkingout') {
        const provider = selectedOffer?.offer.payment_provider ?? null;

        return (
            <div className="pb-2">
                {renderCheckout(provider)}
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