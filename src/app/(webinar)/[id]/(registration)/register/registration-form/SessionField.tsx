"use client";

import { use, useEffect, useState } from "react";
import { DateTime } from "luxon";
import type { Control } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LiveIndicator } from "@/components/ui/live-indicator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NoAvailableSessionsMessage } from "@/webinar/components/NoAvailableSessionsMessage";
import { type Webinar, type SeriesSession } from "@/webinar/service";
import { WebinarSessionStatus } from "@/webinar/service/enum";
import { allowsManualSessionSelection } from "@/webinar/service/guards";
import { buildContrastTokens } from "@/webinar/theme/contrast";
import { embedFieldClassName, panelTone } from "./styles";
import type { AttendeeFormData } from "./schema";

function SessionTime({ iso, zone, format }: { iso: string; zone: string; format: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span aria-hidden className="inline-block h-4 w-48 max-w-full animate-pulse rounded bg-gray-200/70 align-middle dark:bg-slate-700/70" />;
  return <>{DateTime.fromISO(iso, { zone: zone || "utc" }).toFormat(format)}</>;
}

export function SessionFieldLoading() {
  return <div className="animate-pulse rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"><div className="h-4 w-72 max-w-full rounded bg-gray-200" /><div className="mt-2 h-4 w-56 max-w-[80%] rounded bg-gray-200" /></div>;
}

export function SessionField({ webinarPromise, control, primaryColor, secondaryColor, secondaryBackgroundColor }: { webinarPromise: Promise<Webinar>; control: Control<AttendeeFormData>; primaryColor?: string; secondaryColor?: string; secondaryBackgroundColor?: string }) {
  const webinar = use(webinarPromise);
  const sessions = webinar.series?.sessions ?? [];
  const manualSelection = allowsManualSessionSelection(webinar);
  const nextSession = sessions.find((session) => session.status === WebinarSessionStatus.IN_PROGRESS) ?? sessions[0];
  if (!sessions.length) return <NoAvailableSessionsMessage />;
  if (!manualSelection) return <AutoAssignedSession session={nextSession} primaryColor={primaryColor} secondaryColor={secondaryColor} secondaryBackgroundColor={secondaryBackgroundColor} />;

  return <FormField name="session_id" control={control} render={({ field }) => (
    <FormItem className="gap-2"><FormLabel className="text-gray-700 dark:text-slate-300">Select a Session</FormLabel><FormControl>
      <Select value={field.value} onValueChange={field.onChange}><SelectTrigger className={`w-full ${embedFieldClassName}`}><SelectValue placeholder="Select a session" /></SelectTrigger><SelectContent>
        {sessions.map((session) => <SelectItem key={session.id} value={session.id}><span className="flex items-center gap-2"><SessionTime iso={session.scheduled_start} zone={session.timezone || "utc"} format="cccc, LLLL d 'at' t ZZZZ" />{session.status === WebinarSessionStatus.IN_PROGRESS && <LiveBadge />}</span></SelectItem>)}
      </SelectContent></Select>
    </FormControl><FormMessage /></FormItem>
  )} />;
}

function LiveBadge() {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"><LiveIndicator ringClassName="bg-red-500" dotClassName="bg-red-600" />LIVE</span>;
}

function AutoAssignedSession({ session, primaryColor, secondaryColor, secondaryBackgroundColor }: { session?: SeriesSession; primaryColor?: string; secondaryColor?: string; secondaryBackgroundColor?: string }) {
  if (!session) return null;
  const contrast = secondaryBackgroundColor ? buildContrastTokens(secondaryBackgroundColor) : null;
  return <div className="rounded-xl border px-4 py-3" style={panelTone(secondaryColor ?? primaryColor ?? "#140bec", secondaryBackgroundColor)}>
    <p className="text-sm font-semibold text-gray-800 dark:text-slate-100" style={contrast ? { color: contrast.foreground } : undefined}>You&apos;ll be registered for the next available session.</p>
    <p className="mt-1 text-sm text-gray-700 dark:text-slate-300" style={contrast ? { color: contrast.mutedForeground } : undefined}><SessionTime iso={session.scheduled_start} zone={session.timezone || "utc"} format="cccc, LLLL d 'at' t ZZZZ" /></p>
  </div>;
}
