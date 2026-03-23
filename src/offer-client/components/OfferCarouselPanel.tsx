'use client';

import { useOfferSessionClient } from '../hooks/use-offer-session-client';
import { OfferCarousel } from './OfferCarousel';

export function OfferCarouselPanel() {
    const { view, offers, handleOfferClick } = useOfferSessionClient();

    const visibleOffers = offers.filter(
        (os) => !['closed', 'scheduled'].includes(os.status)
    );

    if (view === 'offers-hidden' || visibleOffers.length === 0) return null;

    return (
        <div className="px-3 py-2 border-b bg-muted">
            <OfferCarousel offers={visibleOffers} onOfferClick={handleOfferClick} />
        </div>
    );
}
