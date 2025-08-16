'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { WebinarOffer } from '@/offer/service';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSwipeable } from 'react-swipeable';
import { motion, AnimatePresence } from 'framer-motion';

interface VisibleOfferProps {
  offer: WebinarOffer;
  onClick: (offer: WebinarOffer) => void;
}

function VisibleOffer({ offer, onClick }: VisibleOfferProps) {
  const thumbnail = offer.media.find(
    (m) => m.file_type === 'image' && m.field_type === 'thumbnail'
  );

  return (
    <div
      className="w-full flex items-center gap-4 p-3 border rounded-md bg-accent cursor-pointer transition hover:shadow-lg"
      onClick={() => onClick(offer)}
      style={{ maxHeight: '150px' }}
    >
      {thumbnail && (
        <Image
          src={thumbnail.file_url}
          alt={offer.headline}
          height={80}
          width={80}
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

interface VisibleOffersCarouselProps {
  offers: WebinarOffer[];
  onOfferClick: (offer: WebinarOffer) => void;
}

export function OfferCarousel({
  offers,
  onOfferClick,
}: VisibleOffersCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasMultiple = offers.length > 1;

  const goTo = (i: number) => setIndex((i + offers.length) % offers.length);
  const handlePrev = () => goTo(index - 1);
  const handleNext = () => goTo(index + 1);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Auto-rotation
  useEffect(() => {
    if (!hasMultiple || paused) return;
    intervalRef.current = setInterval(() => {
      if(!pausedRef.current) {
        goTo(index + 1);
      }
    }, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [index, paused, hasMultiple]);

  // Pause on hover/focus
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const pause = () => setPaused(true);
    const resume = () => setPaused(false);

    el.addEventListener('mouseenter', pause);
    el.addEventListener('mouseleave', resume);
    el.addEventListener('focusin', pause);
    el.addEventListener('focusout', resume);

    return () => {
      el.removeEventListener('mouseenter', pause);
      el.removeEventListener('mouseleave', resume);
      el.removeEventListener('focusin', pause);
      el.removeEventListener('focusout', resume);
    };
  }, []);

  // Swipe support
  const {ref: swipeRef, ...handlers} = useSwipeable({
    onSwipedLeft: handleNext,
    onSwipedRight: handlePrev,
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  const mergedRef = useCallback(
      (node: HTMLDivElement | null) => {
        containerRef.current = node;
        swipeRef(node);
      },
      [swipeRef]
    );

  if (offers.length === 0) return null;



  const currentOffer = offers[index];

  return (
    <div
      ref={mergedRef}
      className="relative w-full max-w-full py-2"
      {...handlers}
    >
      {hasMultiple && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-muted hover:bg-muted-foreground text-muted-foreground hover:text-white transition"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-muted hover:bg-muted-foreground text-muted-foreground hover:text-white transition"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      <div className="relative w-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentOffer.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="w-full"
          >
            <VisibleOffer offer={currentOffer} onClick={onOfferClick} />
          </motion.div>
        </AnimatePresence>
      </div>

      {hasMultiple && (
        <div className="flex justify-center mt-2 gap-1">
          {offers.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-2 w-2 rounded-full transition ${
                i === index ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
