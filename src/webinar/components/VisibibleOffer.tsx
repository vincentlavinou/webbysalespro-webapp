'use client';

import { WebinarOffer } from '@webinar/service';
import Image from 'next/image';

interface VisibleOfferProps {
  offer: WebinarOffer;
  onClick: () => void;
}

export function VisibleOffer({ offer, onClick }: VisibleOfferProps) {
  const thumbnail = offer.media.find(
    (m) => m.file_type === 'image' && m.field_type === 'thumbnail'
  );

  return (
    <div
      className="flex items-center gap-4 p-3 border rounded-md bg-accent cursor-pointer transition hover:shadow-lg"
      onClick={onClick}
      style={{ maxHeight: '150px' }}
    >
      {thumbnail && (
        <Image
          src={thumbnail.file_url}
          alt={offer.headline}
          height={20}
          width={20}
          className="w-20 h-20 rounded object-cover border"
        />
      )}
      <div className="flex-1">
        <h4 className="text-sm font-medium">{offer.headline}</h4>
        <p className="text-xs text-muted-foreground truncate">{offer.description}</p>
        <p className="text-xs mt-1 text-primary font-semibold">
          {offer.currency_display} {offer.price}
        </p>
      </div>
    </div>
  );
}
