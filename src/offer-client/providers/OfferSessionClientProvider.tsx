'use client'
import { useCallback, useEffect, useRef, useState } from "react";
import { OfferSessionClientContext } from "../contexts/OfferSessionClientContext"
import { OfferClientUser, OfferSessionDto, OfferView } from "../service/type";
import { onPlaybackPlaying } from "@/emitter/playback";
import { offerVisibilityMetadataSchema, offerScarcityUpdateMetadataSchema } from "../service/schema";
import { getOfferSessionsForAttendee } from "../service/action";
import { useWebinar } from "@/webinar/hooks";
import { useAudienceEvent } from "@/audience-events/hooks/use-audience-event";

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

export function OfferSessionClientProvider({
    children,
    sessionId,
    initialOffers,
    user,
}: OfferSessionClientProviderProps) {
    const { recordEvent } = useWebinar();
    const [offers, setOffers] = useState(initialOffers)
    const [selectedOffer, setSelectedOffer] = useState<OfferSessionDto | undefined>(undefined);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [view, setView] = useState<OfferView>("offers-hidden")
    const hasFetchedOnPlayRef = useRef(false);
    const [purchasedOffer, setPurchasedOffer] = useState<{
        offer: OfferSessionDto;
        ref: string;
    } | undefined>(undefined);

    useAudienceEvent({
        eventType: "webinar:offer:visibility",
        sessionId: sessionId,
        schema: offerVisibilityMetadataSchema,
        getStateScope: (evt) => evt.payload.id,
        compareEventKeys: (incoming, latestApplied) => incoming.localeCompare(latestApplied),
        onEvent: (event) => {
            setOffers((prev) => {
                return prev.map((os) => os.id === event.payload.id ? { ...os, status: event.payload.status } : os)
            })
        }
    })

    useAudienceEvent({
        eventType: "session:offer:scarcity:update",
        sessionId: sessionId,
        schema: offerScarcityUpdateMetadataSchema,
        getStateScope: (evt) => evt.payload.offer_session_id,
        compareEventKeys: (incoming, latestApplied) => incoming.localeCompare(latestApplied),
        onEvent: (event) => {
            setOffers((prev) => {
                return prev.map((os) =>
                    os.id === event.payload.offer_session_id
                        ? {
                            ...os,
                            scarcity_mode: event.payload.mode,
                            display_type: event.payload.display_type,
                            quantity_total: event.payload.quantity_total,
                            display_percent_sold: event.payload.display_percent_sold,
                            display_available_count: event.payload.display_available_count,
                        }
                        : os
                )
            })
        },
        getSignature: (evt) => `${evt.payload.offer_session_id}-${evt.payload.mode}-${evt.payload.display_type}-${evt.payload.display_percent_sold}-${evt.payload.display_available_count}`,
    })

    useEffect(() => {
        return onPlaybackPlaying(() => {
            if (hasFetchedOnPlayRef.current) return;
            hasFetchedOnPlayRef.current = true;
            getOfferSessionsForAttendee({ sessionId }).then((result) => {
                if (result?.data) setOffers(result.data);
            });
        });
    }, [sessionId]);

    useEffect(() => {
        const handleStreamRefresh = () => {
            getOfferSessionsForAttendee({ sessionId }).then((result) => {
                if (result?.data) setOffers(result.data);
            });
        };
        window.addEventListener("webinar:stream:refresh", handleStreamRefresh);
        return () => window.removeEventListener("webinar:stream:refresh", handleStreamRefresh);
    }, [sessionId]);

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
        const calculateView = () => {
            const hasVisibleOffer = offers.find((os) => !["closed", "scheduled"].includes(os.status))
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


    const handleOfferClick = useCallback(async (offer: OfferSessionDto) => {
        const offerType = offer.offer.offer_type;

        if (offerType === "purchase") {
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
    },[setView])

    const cancelCheckout = useCallback(async () => {
        await recordEvent('checkout_canceled');
        setIsCheckingOut(false);
    }, [recordEvent]);

    const handleCheckoutSuccess = useCallback(async (ref: string, sendEvent: boolean = true) => {
        if (selectedOffer && selectedOffer.offer.price) {
            setPurchasedOffer({ offer: selectedOffer, ref: ref });
            if (sendEvent) {
                await recordEvent("purchase_succeeded", {
                    "offer_id": selectedOffer.offer.id,
                    "amount_cents": selectedOffer.offer.price.value * 100,
                    "payment_id": ref
                })
            }
            setView("offer-purchased")
        }
    }, [selectedOffer, recordEvent]);


    return (
        <OfferSessionClientContext.Provider value={{
            sessionId,
            view,
            user,
            isPurchasingOffer: isCheckingOut,
            offers: offers,
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
