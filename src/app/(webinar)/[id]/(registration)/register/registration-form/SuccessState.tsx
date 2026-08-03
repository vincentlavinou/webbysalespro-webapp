"use client";

import { DateTime } from "luxon";
import { CheckCircle } from "lucide-react";
import { buildContrastTokens } from "@/webinar/theme/contrast";
import { panelTone } from "./styles";
import type { RegistrationSuccessState } from "./types";

export function SuccessState({ state, primaryColor, secondaryColor, secondaryBackgroundColor }: { state: RegistrationSuccessState; primaryColor?: string; secondaryColor?: string; secondaryBackgroundColor?: string }) {
  const date = DateTime.fromISO(state.scheduledStart, { zone: state.timezone || "utc" });
  const contrast = secondaryBackgroundColor ? buildContrastTokens(secondaryBackgroundColor) : null;
  return <div className="rounded-2xl border px-5 py-6 text-center" style={panelTone(secondaryColor ?? primaryColor ?? "#140bec", secondaryBackgroundColor)}>
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/40"><CheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" /></div>
    <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-slate-100" style={contrast ? { color: contrast.foreground } : undefined}>You&apos;re Registered!</h3>
    <p className="mt-2 text-sm text-gray-600 dark:text-slate-400" style={contrast ? { color: contrast.mutedForeground } : undefined}>Check your email for your confirmation and join link.</p>
    <div className="mt-5 rounded-xl border border-white/70 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70"><p className="text-sm font-semibold text-gray-800 dark:text-slate-200">Your session is reserved for:</p><p className="mt-1 text-sm text-gray-700 dark:text-slate-300">{date.toFormat("cccc, LLLL d yyyy, h:mm a ZZZZ")}</p></div>
  </div>;
}
