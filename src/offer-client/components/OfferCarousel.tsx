'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useSwipeable } from 'react-swipeable';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { usePulseOnChange } from '@/hooks/use-pulse-on-change';
import type { OfferSessionDto } from '../service/type';

function getCurrencySymbol(code: string): string {
  if (!code) return "";
  try {
    const parts = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? code;
  } catch {
    return code;
  }
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length < 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getContrastColor(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length < 6) return "#000000";
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(value.trim());
}

interface VisibleOfferProps {
  offer: OfferSessionDto;
  onClick: (offer: OfferSessionDto) => void;
}

function VisibleOffer({ offer, onClick }: VisibleOfferProps) {
  const scarcityControls = usePulseOnChange([
    offer.display_percent_sold,
    offer.display_available_count,
  ]);

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
  const accentColor = display?.accent_color?.trim() ?? null;
  const hasAccentHex = accentColor ? isHexColor(accentColor) : false;

  const accentStyle: React.CSSProperties | undefined = hasAccentHex && accentColor
    ? { backgroundColor: accentColor, color: getContrastColor(accentColor) }
    : undefined;
  const accentRingStyle: React.CSSProperties | undefined = hasAccentHex && accentColor
    ? { boxShadow: `0 0 0 1px ${hexToRgba(accentColor, 0.35)}` }
    : undefined;
  const progressTrackStyle: React.CSSProperties | undefined = accentColor
        ? { backgroundColor: hexToRgba(accentColor, 0.2) }
        : undefined;
  const progressIndicatorStyle: React.CSSProperties | undefined = accentColor
        ? { backgroundColor: accentColor }
        : undefined;

  const hasScarcity = offer.scarcity_mode !== "none";
  const scarcityDisplayType = offer.display_type ?? "percentage";
  const percentSold = offer.display_percent_sold;
  const availableCount = offer.display_available_count;
  const totalSlots = offer.quantity_total;

  return (
    <button
      type="button"
      onClick={() => onClick(offer)}
      style={accentRingStyle}
      className={[
        "group w-full text-left rounded-xl px-3 py-2",
        "bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75",
        "shadow-sm hover:shadow-md transition",
        !accentRingStyle ? "ring-1 ring-border/70" : "",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      ].join(" ")}
    >
      <div className="space-y-2">
        {/* Row 1: image + title/subtitle/description */}
        <div className="flex items-start gap-3">
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
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <h4 className="truncate text-sm font-semibold text-foreground">
                {offer.offer.name}
              </h4>
              {badgeText ? (
                <span
                  className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={accentStyle ?? { backgroundColor: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))", boxShadow: "0 0 0 1px hsl(var(--primary) / 0.15)" }}
                >
                  {badgeText}
                </span>
              ) : null}
            </div>

            {offer.offer.subheading ? (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {offer.offer.subheading}
              </p>
            ) : null}

            {offer.offer.description ? (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground/80">
                {offer.offer.description}
              </p>
            ) : null}
          </div>
        </div>

        {/* Row 2: price, Row 3: progress — stacked in same column */}
        <div className="space-y-1.5">
          {effective != null ? (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-primary">
                {getCurrencySymbol(currency)}{formatAmount(Number(effective))}
              </span>
              {showCompareAt && compareAt != null && (
                <>
                  <span className="text-[11px] text-muted-foreground line-through">
                    {getCurrencySymbol(currency)}{formatAmount(Number(compareAt))}
                  </span>
                  {discountPct !== null && (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 bg-emerald-500/5 text-[10px] text-emerald-500"
                    >
                      Save {discountPct}%
                    </Badge>
                  )}
                </>
              )}
            </div>
          ) : null}

          {hasScarcity && (
            <motion.div className="space-y-1" animate={scarcityControls}>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                {scarcityDisplayType === "count" ? (
                  <span className="font-bold">
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
                      <span className="font-bold">
                        {Math.round(percentSold)}% claimed
                        {totalSlots != null && ` • ${Math.max(0, Math.round(totalSlots * (1 - percentSold / 100)))} left`}
                      </span>
                    )}
                  </>
                )}
              </div>
              <Progress
                value={Math.max(0, Math.min(100, percentSold ?? 0))}
                className="h-1.5"
                style={progressTrackStyle}
                indicatorStyle={progressIndicatorStyle}
              />
            </motion.div>
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
