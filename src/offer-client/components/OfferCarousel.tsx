'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSwipeable } from 'react-swipeable';
import { motion, AnimatePresence } from 'framer-motion';
import type { OfferSessionDto } from '../service/type';

function ScarcityBar({
  percentSold,
  totalSlots,
}: {
  percentSold: number;
  totalSlots: number | null;
}) {
  const claimed = totalSlots != null ? Math.round(totalSlots * percentSold / 100) : null;

  return (
    <div className="w-full mt-1">
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${Math.min(percentSold, 100)}%` }}
        />
      </div>
      {claimed != null && totalSlots != null ? (
        <p className="mt-0.5 text-[10px] text-muted-foreground text-right">
          {claimed} of {totalSlots} claimed
        </p>
      ) : (
        <p className="mt-0.5 text-[10px] text-muted-foreground text-right">
          {Math.round(percentSold)}% claimed
        </p>
      )}
    </div>
  );
}

interface VisibleOfferProps {
  offer: OfferSessionDto;
  onClick: (offer: OfferSessionDto) => void;
}

function VisibleOffer({ offer, onClick }: VisibleOfferProps) {
  const thumbnail = useMemo(
    () =>
      offer.offer.media.find(
        (m) => m.file_type === "image" && m.field_type === "thumbnail"
      ),
    [offer.offer.media]
  );

  const currency = offer.offer.price?.currency ?? "";
  const effective = offer.offer.price?.effective_price ?? null;

  const compareAt = offer.offer.price?.compare_at ?? null;

  const showCompareAt =
    compareAt != null &&
    effective != null &&
    Number(compareAt) > Number(effective);

  // ---- Display support (make minimal assumptions about the DTO shape)
  const display = offer.offer.display ?? null;

  const badgeText =
    display?.badge_text ??
    null;

  // Optional accent “type” if you have it (featured, hot, limited, etc.)
  const accent =
    display?.accent_color ??
    null;

  const accentClass =
    accent === "featured"
      ? "ring-primary/20"
      : accent === "warning"
      ? "ring-amber-500/20"
      : accent === "success"
      ? "ring-emerald-500/20"
      : "ring-border/70";

  const badgeClass =
    accent === "warning"
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-500/20"
      : accent === "success"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20"
      : "bg-primary/10 text-primary ring-primary/15";

  return (
    <button
      type="button"
      onClick={() => onClick(offer)}
      className={[
        "group w-full text-left rounded-xl px-3 py-2",
        "bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75",
        "ring-1 shadow-sm hover:shadow-md transition",
        accentClass,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        {thumbnail ? (
          <div className="shrink-0">
            <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-muted ring-1 ring-border/70">
              <Image
                src={thumbnail.file_url}
                alt={offer.offer.name}
                height={14}
                width={14}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
          </div>
        ) : (
          <div className="h-14 w-14 shrink-0 rounded-lg bg-muted ring-1 ring-border/70" />
        )}

        {/* Main content + right stack */}
        <div className="min-w-0 flex-1 flex items-start justify-between gap-3">
          {/* Left: Title + display badge + description */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <h4 className="truncate text-sm font-semibold text-foreground">
                {offer.offer.name}
              </h4>

              {badgeText ? (
                <span
                  className={[
                    "shrink-0 inline-flex items-center rounded-full px-2 py-0.5",
                    "text-[11px] font-semibold ring-1",
                    badgeClass,
                  ].join(" ")}
                >
                  {badgeText}
                </span>
              ) : null}
            </div>

            {offer.offer.description ? (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {offer.offer.description}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-muted-foreground/70">
                Tap to view details
              </p>
            )}
          </div>

          {/* Right: compare-at + effective (scarcity/bonuses later) */}
          <div className="shrink-0 w-[132px] flex flex-col items-end gap-1">
            {showCompareAt && (
              <div className="text-[11px] text-muted-foreground line-through">
                {currency} {compareAt}
              </div>
            )}

            {effective != null && (
              <div className="rounded-full px-2 py-0.5 text-xs font-semibold bg-primary/10 text-primary ring-1 ring-primary/15">
                {currency} {effective}
              </div>
            )}

            {/* Scarcity bar */}
            {offer.scarcity_mode !== "none" && offer.display_percent_sold != null && (
              <ScarcityBar
                percentSold={offer.display_percent_sold}
                totalSlots={offer.display_total_slots ?? null}
              />
            )}
          </div>
        </div>
      </div>
    </button>
  );
}


interface OfferCarouselProps {
  offers: OfferSessionDto[];
  onOfferClick: (offer: OfferSessionDto) => void;
}

export function OfferCarousel({ offers, onOfferClick }: OfferCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const pausedRef = useRef(paused);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasMultiple = offers.length > 1;

  const goTo = useCallback(
    (i: number) => {
      if (offers.length === 0) return;
      setIndex((i + offers.length) % offers.length);
    },
    [offers.length]
  );

  const handlePrev = useCallback(() => goTo(index - 1), [goTo, index]);
  const handleNext = useCallback(() => goTo(index + 1), [goTo, index]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Auto-rotation
  useEffect(() => {
    if (!hasMultiple || paused) return;

    intervalRef.current = setInterval(() => {
      if (!pausedRef.current) {
        goTo(index + 1);
      }
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [index, paused, hasMultiple, goTo]);

  // Pause on hover/focus
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
  const { ref: swipeRef, ...handlers } = useSwipeable({
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

  const navBtnClass = [
    "absolute top-1/2 -translate-y-1/2 z-10",
    "h-8 w-8 rounded-full grid place-items-center",
    "bg-card/80 supports-[backdrop-filter]:bg-card/70 backdrop-blur",
    "ring-1 ring-border/70 shadow-sm",
    "text-muted-foreground hover:text-foreground",
    "hover:ring-border hover:shadow-md transition",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  ].join(" ");

  return (
    <div ref={mergedRef} className="relative w-full" {...handlers}>
      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous offer"
            className={`${navBtnClass} left-2`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Next offer"
            className={`${navBtnClass} right-2`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* No more px-10. Just add small inset padding so buttons don't overlap */}
      <div className="px-4 sm:px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentOffer.id}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <VisibleOffer offer={currentOffer} onClick={onOfferClick} />
          </motion.div>
        </AnimatePresence>
      </div>

      {hasMultiple && (
        <div className="mt-2 flex justify-center gap-1.5">
          {offers.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to offer ${i + 1}`}
              className={[
                "h-1.5 w-1.5 rounded-full transition",
                i === index
                  ? "bg-primary"
                  : "bg-muted-foreground/25 hover:bg-muted-foreground/40",
              ].join(" ")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
