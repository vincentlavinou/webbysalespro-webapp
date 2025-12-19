'use client'
import { createContext } from "react"
import { OfferSessionDto, OfferView } from "../service/type";


interface OfferSessionClientContextType {
    sessionId: string;
    token: string;
    email: string;
    view: OfferView;
    offers: OfferSessionDto[];
    selectedOffer?: OfferSessionDto;
    purchasedOffer?: {offer: OfferSessionDto, ref: string};
    isPurchasingOffer: boolean;
    setSelectedOffer: (offer: OfferSessionDto | undefined) => void
    setPurchasedOffer: (input: { offer: OfferSessionDto, ref: string } | undefined) => void
    recordEvent: (name: string, token: string, payload?: Record<string, unknown>) => Promise<void>
    handleCheckoutSuccess: (ref: string) => void
    setIsCheckingOut: (value: boolean) => void
    closeSheetAfterPurchase: () => void
}

export const OfferSessionClientContext = createContext<OfferSessionClientContextType>({
    sessionId: "",
    token: "",
    email: "",
    view: 'offers-hidden',
    offers: [],
    isPurchasingOffer: false,
    setSelectedOffer: () => { },
    setPurchasedOffer: () => { },
    recordEvent: async () => { },
    handleCheckoutSuccess: () => {},
    setIsCheckingOut: () => {},
    closeSheetAfterPurchase: () => {}
})