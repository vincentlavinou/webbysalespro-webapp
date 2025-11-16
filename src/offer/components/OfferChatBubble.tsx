import { useBroadcastUser } from "@/broadcast/hooks/use-broadcast-user";
import { useWebinar } from "@/webinar/hooks"
import { useCallback, useState } from "react";
import { WebinarOffer } from "../service";
import { OfferCarousel } from "./OfferCarousel";
import { SelectedOffer } from "./SelectedOffer";
import { Button } from "@/components/ui/button";
import { StripeCheckout } from "../checkout/stripe";
import { getPaymentProviderLabel, PaymentProviderType } from "@/paymentprovider/service/enum";
import { FanBasisCheckout } from "../checkout/fanbasis";
import OfferPurchaseSuccess from "./OfferPurchaseSuccess";


export function OfferChatBubble() {

    const { email } = useBroadcastUser();
    const { session, webinar, token, recordEvent } = useWebinar();

    const [selectedOffer, setSelectedOffer] = useState<WebinarOffer | undefined>(undefined);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    // new: success state
    const [purchaseSuccess, setPurchaseSuccess] = useState<{
        offer: WebinarOffer;
        reference?: string;
    } | undefined>(undefined);

    const resetView = () => {
        setIsCheckingOut(false);
        setSelectedOffer(undefined);
    };

    const handleCheckoutSuccess = useCallback(async (ref: string) => {
        if (selectedOffer && session) {
            setPurchaseSuccess({ offer: selectedOffer, reference: ref });
            await recordEvent("purchase_succeeded", {
                "amount_cents": selectedOffer.price * 100 // cents
            })
        }
    },[selectedOffer, session]);

    if (session?.offer_visible && !selectedOffer && webinar) {
        {/* Offer carousel (hidden when offer open) */ }
        return (
            <div className="mt-2">
                <OfferCarousel offers={webinar.offers} onOfferClick={(offer) => setSelectedOffer(offer)} />
            </div>
        )
    }

    return (
        <>
            {/* Success view */}
            {purchaseSuccess && email && (
                <div className="mt-2">
                    <OfferPurchaseSuccess
                        offer={purchaseSuccess.offer}
                        email={email}
                        paymentReference={purchaseSuccess.reference}
                        onClose={() => {
                            setPurchaseSuccess(undefined);
                            resetView();
                        }}
                    // onViewReceipt={() => window.open(receiptUrl, "_blank")} // if/when you have one
                    />
                </div>
            )}

            {/* Offer drawer and Stripe checkout */}
            {selectedOffer && !purchaseSuccess && (
                <div className="mt-2 p-4 border rounded bg-secondary max-h-[400px] overflow-y-auto">
                    {!isCheckingOut ? (
                        <SelectedOffer
                            selectedOffer={selectedOffer}
                            setIsCheckingOut={setIsCheckingOut}
                            setSelectedOffer={setSelectedOffer}
                        />
                    ) : (
                        <div className="pt-2">
                            {webinar && token && email && session && selectedOffer.provider_display === getPaymentProviderLabel(PaymentProviderType.STRIPE) && (
                                <StripeCheckout
                                    offerId={selectedOffer.id}
                                    webinarId={webinar.id}
                                    token={token}
                                    email={email}
                                    sessionId={session?.id}
                                    onSuccess={handleCheckoutSuccess}
                                />
                            )}
                            {webinar && token && email && selectedOffer.provider_display === getPaymentProviderLabel(PaymentProviderType.FAN_BASIS) && (
                                <FanBasisCheckout
                                    offerId={selectedOffer.id}
                                    webinarId={webinar.id}
                                    token={token}
                                />
                            )}
                            <Button
                                variant="ghost"
                                className="mt-2 w-full text-xs justify-start text-muted-foreground hover:text-foreground hover:bg-accent"
                                onClick={() => setIsCheckingOut(false)}
                            >
                                ← Back to Offer
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </>
    )
}