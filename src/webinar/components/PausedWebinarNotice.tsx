"use client";

import { AlertTriangle, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { WebinarPauseInfo } from "@/webinar/service";

interface PausedWebinarNoticeProps {
  pauseInfo: WebinarPauseInfo;
  title?: string;
}

export function PausedWebinarNotice({
  pauseInfo,
  title = "This webinar is paused",
}: PausedWebinarNoticeProps) {
  const message =
    pauseInfo.message?.trim() ||
    "Registration is temporarily paused. Please check back later or contact support.";

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-sm dark:border-amber-900/50 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
        <AlertTriangle className="h-3.5 w-3.5" />
        Paused
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
        {message}
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        {pauseInfo.link_url ? (
          <Button asChild className="rounded-xl bg-amber-600 text-white hover:bg-amber-700">
            <a href={pauseInfo.link_url} target="_blank" rel="noreferrer">
              {pauseInfo.link_label?.trim() || "Learn more"}
            </a>
          </Button>
        ) : null}

        <Button asChild variant="outline" className="rounded-xl">
          <a href={`mailto:${pauseInfo.support_email}`}>
            <Mail className="h-4 w-4" />
            Contact support
          </a>
        </Button>
      </div>

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        Support email:{" "}
        <a className="font-medium text-slate-700 underline underline-offset-4 dark:text-slate-200" href={`mailto:${pauseInfo.support_email}`}>
          {pauseInfo.support_email}
        </a>
      </p>
    </div>
  );
}
