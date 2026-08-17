'use client';

import Image from 'next/image';
import { OfferCarousel } from '@lavinou/webbysalespro/offer/ui';
import { offerThumbnail } from '@lavinou/webbysalespro/offer';
import { useOfferSessionClient } from '../hooks/use-offer-session-client';

/**
 * The live offers, above the transcript.
 *
 * The carousel itself now comes from the platform package, so the console's
 * preview draws the same thing an attendee is looking at — autoplay, swipe,
 * dot pager and all. It used to be 385 lines here and a different component
 * there, which made the preview a picture of something else.
 *
 * Which offers are visible is `visibleOfferSessions` inside the carousel, not a
 * filter here. The local one dropped `closed` and `scheduled` but never sorted
 * by `order`, so a re-ordered drop showed attendees a different sequence from
 * the one the console had arranged.
 */
export function OfferCarouselPanel() {
    const { view, offers, handleOfferClick } = useOfferSessionClient();

    // Not an offer fact — this surface hides the rail while a checkout sheet or
    // the purchase confirmation is up.
    if (view === 'offers-hidden') return null;

    return (
        <OfferCarousel
            className="px-3 py-2 border-b bg-muted"
            sessions={offers}
            onOfferSelect={handleOfferClick}
            renderThumbnail={(session) => {
                const media = offerThumbnail(session.offer.media);
                if (!media) return null;
                return (
                    <Image
                        src={media.file_url}
                        alt={session.offer.name}
                        width={80}
                        height={80}
                        className="h-20 w-20 rounded-md border border-border object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                );
            }}
        />
    );
}
