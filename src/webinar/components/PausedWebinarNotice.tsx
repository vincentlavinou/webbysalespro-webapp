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
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 shadow-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.14),transparent_38%)]" />

      <div className="relative">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5" />
          Paused
        </div>

        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
            {message}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {pauseInfo.link_url ? (
            <Button asChild className="rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300">
              <a href={pauseInfo.link_url} target="_blank" rel="noreferrer">
                {pauseInfo.link_label?.trim() || "Learn more"}
              </a>
            </Button>
          ) : null}

          <Button asChild variant="outline" className="rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
            <a href={`mailto:${pauseInfo.support_email}`}>
              <Mail className="h-4 w-4" />
              Contact support
            </a>
          </Button>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Support email:{" "}
          <a
            className="font-medium text-slate-200 underline underline-offset-4 decoration-slate-500/70 hover:text-white"
            href={`mailto:${pauseInfo.support_email}`}
          >
            {pauseInfo.support_email}
          </a>
        </p>
      </div>
    </div>
  );
}
