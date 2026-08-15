'use client'

import { useCallback, useEffect, useRef, useState } from "react";
import { OfferSessionsProvider, useOfferSessions } from "@lavinou/webbysalespro/offer/react";
import type { OfferSessionDto } from "@lavinou/webbysalespro/offer";
import { OfferSessionClientContext } from "../contexts/OfferSessionClientContext"
import { OfferClientUser, OfferView } from "../service/type";
import { onPlaybackPlaying } from "@/emitter/playback";
import { getOfferSessionsForAttendee } from "../service/action";
import { useWebinar } from "@/webinar/hooks";

function getExternalUrl(actionPayload: Record<string, unknown> | undefined): string | null {
    if (!actionPayload) return null;
    const keys = ["external_link", "external_url", "url", "link", "href", "cta_url"];
    for (const key of keys) {
        const value = actionPayload[key];
        if (typeof value !== "string") continue;
        const trimmed = value.trim();
        if (!trimmed) continue;
        try {
            const url = new URL(trimmed);
            if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
        } catch { /* ignore */ }
    }
    return null;
}

interface OfferSessionClientProviderProps {
    children: React.ReactNode
    sessionId: string,
    initialOffers: OfferSessionDto[],
    user: OfferClientUser,
}

export function OfferSessionClientProvider(props: OfferSessionClientProviderProps) {
    return (
        <OfferSessionsProvider
            sessionId={props.sessionId}
            targetAudience="attendee"
            initialSessions={props.initialOffers}
        >
            <OfferSessionClientState {...props} />
        </OfferSessionsProvider>
    );
}

function OfferSessionClientState({
    children,
    sessionId,
    initialOffers,
    user,
}: OfferSessionClientProviderProps) {
    const { recordEvent } = useWebinar();
    const { sessions: offers, replaceSessions } = useOfferSessions();
    const [selectedOffer, setSelectedOffer] = useState<OfferSessionDto | undefined>(undefined);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [view, setView] = useState<OfferView>("offers-hidden")
    const hasFetchedOnPlayRef = useRef(false);
    const [purchasedOffer, setPurchasedOffer] = useState<{
        offer: OfferSessionDto;
        ref: string;
    } | undefined>(undefined);

    useEffect(() => {
        replaceSessions(initialOffers);
    }, [initialOffers, replaceSessions]);

    useEffect(() => {
        return onPlaybackPlaying(() => {
            if (hasFetchedOnPlayRef.current) return;
            hasFetchedOnPlayRef.current = true;
            getOfferSessionsForAttendee({ sessionId }).then((result) => {
                if (result?.data) replaceSessions(result.data);
            });
        });
    }, [replaceSessions, sessionId]);

    useEffect(() => {
        const handleStreamRefresh = () => {
            getOfferSessionsForAttendee({ sessionId }).then((result) => {
                if (result?.data) replaceSessions(result.data);
            });
        };
        window.addEventListener("webinar:stream:refresh", handleStreamRefresh);
        return () => window.removeEventListener("webinar:stream:refresh", handleStreamRefresh);
    }, [replaceSessions, sessionId]);

    useEffect(() => {
        const hasVisibleOffer = offers.some(
            (os) => !["closed", "scheduled"].includes(os.status)
        );
        if (!hasVisibleOffer) {
            setSelectedOffer(undefined);
            setIsCheckingOut(false);
        }
    }, [offers]);

    useEffect(() => {
        if (!selectedOffer) return;
        const updated = offers.find((os) => os.id === selectedOffer.id);
        if (!updated || ["closed", "scheduled"].includes(updated.status)) {
            setSelectedOffer(undefined);
            setIsCheckingOut(false);
        }
    }, [offers, selectedOffer]);

    useEffect(() => {
        const hasVisibleOffer = offers.find((os) => !["closed", "scheduled"].includes(os.status))
        const hasSelectedOffer = selectedOffer !== undefined
        const hasPurchasedOffer = purchasedOffer !== undefined

        if (hasPurchasedOffer) setView("offer-purchased");
        else if (isCheckingOut) setView("offer-checkingout");
        else if (hasSelectedOffer) setView("offer-selected");
        else if (hasVisibleOffer) setView("offers-visible");
        else setView("offers-hidden");
    }, [offers, selectedOffer, purchasedOffer, isCheckingOut])

    const handleOfferClick = useCallback(async (offer: OfferSessionDto) => {
        const offerType = offer.offer.offer_type;

        if (offerType === "purchase" || offerType === "schedule_call") {
            setSelectedOffer(offer);
            setIsCheckingOut(true);
            await recordEvent("offer_shown", { offer_id: offer.offer.id });
            return;
        }

        if (offerType === "external_link") {
            const externalUrl = getExternalUrl(offer.offer.action_payload);
            if (externalUrl) {
                window.open(externalUrl, "_blank", "noopener,noreferrer");
                recordEvent("offer_shown", { offer_id: offer.offer.id });
            }
            return;
        }

        setSelectedOffer(offer);
    }, [recordEvent]);

    const resetView = () => {
        setIsCheckingOut(false);
        setSelectedOffer(undefined);
        setPurchasedOffer(undefined)
    };

    const closeSheetAfterPurchase = useCallback(() => {
        resetView()
        setView("offers-hidden")
    },[])

    const cancelCheckout = useCallback(async () => {
        await recordEvent('checkout_canceled');
        setIsCheckingOut(false);
    }, [recordEvent]);

    const handleCheckoutSuccess = useCallback((ref: string) => {
        if (selectedOffer && selectedOffer.offer.price) {
            setPurchasedOffer({ offer: selectedOffer, ref: ref });
            setView("offer-purchased")
        }
    }, [selectedOffer]);

    return (
        <OfferSessionClientContext.Provider value={{
            sessionId,
            view,
            user,
            isPurchasingOffer: isCheckingOut,
            offers,
            selectedOffer,
            purchasedOffer,
            setPurchasedOffer,
            setSelectedOffer,
            handleCheckoutSuccess,
            recordEvent,
            setIsCheckingOut,
            cancelCheckout,
            closeSheetAfterPurchase,
            handleOfferClick
        }}>
            {children}
        </OfferSessionClientContext.Provider>
    )
}
