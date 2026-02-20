'use client';

import Image from "next/image";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOfferSessionClient } from "../hooks/use-offer-session-client";

function toNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function discountPercent(compareAt: number | null, effective: number | null) {
  if (compareAt == null || effective == null) return null;
  if (compareAt <= effective) return null;
  return Math.round(((compareAt - effective) / compareAt) * 100);
}

export function SelectedOffer() {
  const {
    token,
    selectedOffer,
    recordEvent,
    setIsCheckingOut,
    setSelectedOffer,
  } = useOfferSessionClient();

  useEffect(() => {
    const load = async () => {
      if (!selectedOffer?.id) return;
      await recordEvent("offer_shown", token, { offer_id: selectedOffer.id });
    };
    load();
  }, [recordEvent, selectedOffer?.id, token]);

  const offer = selectedOffer?.offer;
  const display = offer?.display;

  const thumbnail = useMemo(() => {
    if (!offer?.media) return undefined;
    return offer.media.find(
      (m) => m.file_type === "image" && m.field_type === "thumbnail"
    );
  }, [offer?.media]);

  const currency = offer?.price?.currency ?? "USD";
  const effectivePrice = toNumber(offer?.price?.effective_price);
  const compareAt = toNumber(offer?.price?.compare_at);
  const savePct = discountPercent(compareAt, effectivePrice);

  const ctaLabel = display?.cta_label || "Buy now";

  if (!selectedOffer || !offer) return null;

  return (
    <div
      className={[
        // Card container (matches VisibleOffer vibe)
        "rounded-xl",
        "bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75",
        "ring-1 ring-border/70 shadow-sm",
        "p-3",
      ].join(" ")}
    >
      <div className="space-y-3">
        {/* Header row: thumbnail + title/badge/subheading */}
        <div className="flex gap-3">
          {thumbnail?.file_url ? (
            <div className="hidden md:block shrink-0">
              <div className="relative h-24 w-24 overflow-hidden rounded-md border border-border bg-muted">
                <Image
                  src={thumbnail.file_url}
                  alt={offer.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </div>
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-sm font-semibold text-foreground">
                {offer.name}
              </h3>

              {display?.badge_text ? (
                <Badge className="text-[10px]">
                  {display.badge_text}
                </Badge>
              ) : null}
            </div>

            {offer.subheading ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {offer.subheading}
              </p>
            ) : null}
          </div>
        </div>

        {/* Description */}
        {offer.description ? (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {offer.description}
          </p>
        ) : null}

        {/* Price row + offer type */}
        <div className="flex items-center justify-between gap-2">
          {effectivePrice != null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-primary">
                {currency} {effectivePrice.toFixed(2)}
              </span>

              {compareAt != null && compareAt > effectivePrice ? (
                <span className="text-xs text-muted-foreground line-through">
                  {compareAt.toFixed(2)}
                </span>
              ) : null}

              {savePct !== null ? (
                <Badge
                  variant="outline"
                  className="border-emerald-500/40 bg-emerald-500/5 text-[10px] text-emerald-600 dark:text-emerald-400"
                >
                  Save {savePct}%
                </Badge>
              ) : null}
            </div>
          ) : (
            <div />
          )}

          <div className="flex gap-1">
            {offer.offer_type === "purchase" && (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                Purchase offer
              </span>
            )}
            {offer.offer_type === "schedule_call" && (
              <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400">
                Schedule a call
              </span>
            )}
            {offer.offer_type === "complete_form" && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                Complete a form
              </span>
            )}
          </div>
        </div>

        {/* Scarcity widget */}
        {selectedOffer.scarcity_mode !== "none" && selectedOffer.display_type != null && (
          <div className="w-full">
            {selectedOffer.display_type === "count" && selectedOffer.display_available_count != null ? (
              <p className="mt-1 text-[11px] text-muted-foreground text-center font-medium">
                {selectedOffer.display_available_count} spot{selectedOffer.display_available_count !== 1 ? "s" : ""} left
              </p>
            ) : selectedOffer.display_type === "percentage" && selectedOffer.display_percent_sold != null ? (
              <>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(selectedOffer.display_percent_sold, 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground text-center">
                  {Math.round(selectedOffer.display_percent_sold)}% claimed
                </p>
              </>
            ) : null}
          </div>
        )}

        {/* CTA */}
        <Button
          className="w-full"
          type="button"
          disabled={selectedOffer.status === "sold_out"}
          onClick={() => setIsCheckingOut(true)}
        >
          {selectedOffer.status === "sold_out" ? "Sold Out" : ctaLabel}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full text-xs text-muted-foreground hover:bg-accent"
          onClick={() => setSelectedOffer(undefined)}
        >
          Close
        </Button>
      </div>
    </div>
  );
}
