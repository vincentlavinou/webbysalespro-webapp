'use client';

import * as React from "react";
import Image from "next/image";
import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { usePulseOnChange } from "@/hooks/use-pulse-on-change";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useOfferSessionClient } from "../hooks/use-offer-session-client";
import { notifyErrorUiMessage } from "@/lib/notify";

function toNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

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

function discountPercent(compareAt: number | null, effective: number | null) {
  if (compareAt == null || effective == null) return null;
  if (compareAt <= effective) return null;
  return Math.round(((compareAt - effective) / compareAt) * 100);
}

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
      if (url.protocol === "http:" || url.protocol === "https:") {
        return url.toString();
      }
    } catch {
      // ignore malformed URLs and continue checking other keys
    }
  }

  return null;
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
  const isExternalLinkOffer = offer?.offer_type === "external_link";

  const accentColor = display?.accent_color?.trim() ?? null;
  const hasAccentHex = accentColor ? isHexColor(accentColor) : false;

  const accentStyle: React.CSSProperties | undefined = hasAccentHex && accentColor
    ? { backgroundColor: accentColor, color: getContrastColor(accentColor) }
    : undefined;
  const progressIndicatorStyle: React.CSSProperties | undefined = hasAccentHex && accentColor
    ? { backgroundColor: accentColor }
    : undefined;
  const progressTrackStyle: React.CSSProperties | undefined = hasAccentHex && accentColor
    ? { backgroundColor: hexToRgba(accentColor, 0.2) }
    : undefined;

  const scarcityControls = usePulseOnChange([
    selectedOffer?.display_percent_sold,
    selectedOffer?.display_available_count,
  ]);

  if (!selectedOffer || !offer) return null;

  return (
    <div
      className={[
        // Card container (matches VisibleOffer vibe)
        "rounded-xl",
        "bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75",
        "ring-1 ring-border/70 shadow-sm",
        "p-1",
      ].join(" ")}
    >
      <div className="space-y-3">
        {/* Header row: thumbnail + title/badge/subheading */}
        <div className="flex gap-3">
          {thumbnail?.file_url ? (
            <div className="shrink-0">
              <div className="relative h-20 w-20 overflow-hidden rounded-md border border-border bg-muted">
                <Image
                  src={thumbnail.file_url}
                  alt={offer.name}
                  fill
                  sizes="80px"
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
                <Badge
                  className="text-[10px]"
                  style={accentStyle}
                >
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

        {/* Price + scarcity — vertically stacked */}
        <div className="space-y-1.5">
          {effectivePrice != null ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-sm font-semibold text-primary">
                {getCurrencySymbol(currency)}{formatAmount(effectivePrice)}
              </span>

              {compareAt != null && compareAt > effectivePrice ? (
                <span className="text-xs text-muted-foreground line-through">
                  {getCurrencySymbol(currency)}{formatAmount(compareAt)}
                </span>
              ) : null}

              {savePct !== null ? (
                <Badge
                  variant="outline"
                  className="border-emerald-500/40 bg-emerald-500/5 text-[10px] text-emerald-500"
                >
                  Save {savePct}%
                </Badge>
              ) : null}
            </div>
          ) : null}

          {selectedOffer.scarcity_mode !== "none" && (
            <motion.div className="space-y-1" animate={scarcityControls}>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                {(selectedOffer.display_type ?? "percentage") === "count" ? (
                  <span className="font-bold">
                    {selectedOffer.display_available_count != null
                      ? `${selectedOffer.display_available_count} spot${selectedOffer.display_available_count !== 1 ? "s" : ""} left`
                      : "Spots filling up"}
                  </span>
                ) : (
                  <>
                    <span>
                      {selectedOffer.quantity_total != null
                        ? `${selectedOffer.quantity_total} spots`
                        : "Spots filling up"}
                    </span>
                    {selectedOffer.display_percent_sold !== null && (
                      <span className="font-bold">
                        {Math.round(selectedOffer.display_percent_sold)}% claimed
                        {selectedOffer.quantity_total != null && ` • ${Math.max(0, Math.round(selectedOffer.quantity_total * (1 - selectedOffer.display_percent_sold / 100)))} left`}
                      </span>
                    )}
                  </>
                )}
              </div>
              <Progress
                value={Math.max(0, Math.min(100, selectedOffer.display_percent_sold ?? 0))}
                className="h-1.5"
                style={progressTrackStyle}
                indicatorStyle={progressIndicatorStyle}
              />
            </motion.div>
          )}
        </div>

        {/* Offer type pill */}
        <div className="flex gap-1">

        </div>

        {/* CTA */}
        <Button
          className="w-full"
          type="button"
          disabled={selectedOffer.status === "sold_out"}
          style={accentStyle}
          onClick={() => {
            if (isExternalLinkOffer) {
              const externalUrl = getExternalUrl(offer.action_payload);
              if (!externalUrl) {
                notifyErrorUiMessage(
                  undefined,
                  "This offer link is unavailable right now."
                );
                return;
              }

              window.open(externalUrl, "_blank", "noopener,noreferrer");
              return;
            }

            setIsCheckingOut(true);
          }}
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
