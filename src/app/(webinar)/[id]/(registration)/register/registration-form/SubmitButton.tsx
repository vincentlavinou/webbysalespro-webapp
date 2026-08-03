"use client";

import { use } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Webinar } from "@/webinar/service";
import { buttonTone } from "./styles";

type SubmitButtonProps = { webinarPromise: Promise<Webinar>; submitButtonRef: { current: HTMLDivElement | null }; primaryColor?: string; buttonTextColor?: string; ctaLabel?: string; isHydrated: boolean; isPending: boolean; isNavigating: boolean };

export function SubmitButtonLoading({ primaryColor, buttonTextColor }: Pick<SubmitButtonProps, "primaryColor" | "buttonTextColor">) {
  return <Button type="submit" className={`mt-2 w-full rounded-xl py-3 text-base font-semibold text-white ${primaryColor ? "" : "bg-emerald-600"}`} style={buttonTone(primaryColor, buttonTextColor)} disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading form...</Button>;
}

export function SubmitButton({ webinarPromise, submitButtonRef, primaryColor, buttonTextColor, ctaLabel, isHydrated, isPending, isNavigating }: SubmitButtonProps) {
  const webinar = use(webinarPromise);
  const hasSessions = Boolean(webinar.series?.sessions?.length);
  const busy = isPending || isNavigating;
  const label = !isHydrated ? "Loading form..." : isPending ? "Registering..." : isNavigating ? "Redirecting..." : ctaLabel || "Reserve My Spot →";
  return <div ref={submitButtonRef}><Button type="submit" className={`mt-2 w-full rounded-xl py-3 text-base font-semibold text-white transition-colors ${primaryColor ? "hover:opacity-90" : "bg-emerald-600 hover:bg-emerald-700"}`} style={buttonTone(primaryColor, buttonTextColor)} disabled={!isHydrated || busy || !hasSessions} aria-busy={!isHydrated || busy}>{(!isHydrated || busy) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{label}</Button></div>;
}
