'use client'
import { createContext } from "react"
import { BroadcastUser } from "@/broadcast/service/type";
import { OfferSessionDto, OfferView } from "../service/type";


interface OfferSessionClientContextType {
    sessionId: string;
    user: BroadcastUser;
    view: OfferView;
    offers: OfferSessionDto[];
    selectedOffer?: OfferSessionDto;
    purchasedOffer?: {offer: OfferSessionDto, ref: string};
    isPurchasingOffer: boolean;
    setSelectedOffer: (offer: OfferSessionDto | undefined) => void
    setPurchasedOffer: (input: { offer: OfferSessionDto, ref: string } | undefined) => void
    recordEvent: (name: string, payload?: Record<string, unknown>) => Promise<void>
    handleCheckoutSuccess: (ref: string, sendEvent?: boolean) => void
    setIsCheckingOut: (value: boolean) => void
    cancelCheckout: () => Promise<void>
    closeSheetAfterPurchase: () => void
    handleOfferClick: (offer: OfferSessionDto) => void
}

export const OfferSessionClientContext = createContext<OfferSessionClientContextType>({
    sessionId: "",
    user: { user_id: "" },
    view: 'offers-hidden',
    offers: [],
    isPurchasingOffer: false,
    setSelectedOffer: () => { },
    setPurchasedOffer: () => { },
    recordEvent: async () => { },
    handleCheckoutSuccess: () => {},
    setIsCheckingOut: () => {},
    cancelCheckout: async () => {},
    closeSheetAfterPurchase: () => {},
    handleOfferClick: () => {}
})
