'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Percent } from 'lucide-react';
import { useSwipeable } from 'react-swipeable';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import type { OfferSessionDto } from '../service/type';

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

  const discountPct =
    showCompareAt && compareAt != null && effective != null
      ? Math.round(((Number(compareAt) - Number(effective)) / Number(compareAt)) * 100)
      : null;

  const display = offer.offer.display ?? null;
  const badgeText = display?.badge_text ?? null;
  const accentColor = display?.accent_color ?? null;

  const accentClass =
    accentColor === "featured"
      ? "ring-primary/20"
      : accentColor === "warning"
      ? "ring-amber-500/20"
      : accentColor === "success"
      ? "ring-emerald-500/20"
      : "ring-border/70";

  const badgeClass =
    accentColor === "warning"
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-500/20"
      : accentColor === "success"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20"
      : "bg-primary/10 text-primary ring-primary/15";

  const hasScarcity = offer.scarcity_mode !== "none";
  const scarcityDisplayType = offer.display_type ?? "percentage";
  const percentSold = offer.display_percent_sold;
  const availableCount = offer.display_available_count;
  const totalSlots = offer.quantity_total;

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
      <div className="flex items-center gap-3">
        {/* Thumbnail */}
        {thumbnail ? (
          <div className="shrink-0">
            <Image
              src={thumbnail.file_url}
              alt={offer.offer.name}
              height={80}
              width={80}
              className="h-20 w-20 rounded-md border border-border object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </div>
        ) : (
          <div className="h-20 w-20 shrink-0 rounded-md bg-muted ring-1 ring-border/70" />
        )}

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Title + badge */}
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

          {/* Subheading */}
          {offer.offer.subheading ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {offer.offer.subheading}
            </p>
          ) : null}

          {/* Description */}
          {offer.offer.description ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground/80">
              {offer.offer.description}
            </p>
          ) : null}

          {/* Price row */}
          {effective != null ? (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="font-semibold text-primary">
                {currency} {Number(effective).toFixed(2)}
              </span>
              {showCompareAt && compareAt != null && (
                <>
                  <span className="text-[11px] text-muted-foreground line-through">
                    {Number(compareAt).toFixed(2)}
                  </span>
                  {discountPct !== null && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-500">
                      <Percent className="h-3 w-3" />
                      -{discountPct}%
                    </span>
                  )}
                </>
              )}
            </div>
          ) : null}

          {/* Scarcity */}
          {hasScarcity && (
            <div className="mt-1 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                {scarcityDisplayType === "count" ? (
                  <span className="font-medium">
                    {availableCount !== null
                      ? `${availableCount} spot${availableCount !== 1 ? "s" : ""} left`
                      : "Spots filling up"}
                  </span>
                ) : (
                  <>
                    <span>
                      {totalSlots != null ? `${totalSlots} spots` : "Spots filling up"}
                    </span>
                    {percentSold !== null && (
                      <span className="font-medium">{Math.round(percentSold)}% claimed</span>
                    )}
                  </>
                )}
              </div>
              <Progress
                value={Math.max(0, Math.min(100, percentSold ?? 0))}
                className="h-1.5"
              />
            </div>
          )}
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
      {/* No more px-10. Just add small inset padding so buttons don't overlap */}
      <div className="px-1 sm:px-1">
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
