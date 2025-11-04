"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, Users, MessageSquareMore, BarChart3, TimerReset } from "lucide-react";
import { cn } from "@/lib/utils"; // optional: replace with a local helper or remove if you don't use cn()

/**
 * WebinarViewLoading
 * --------------------------------------------------------
 * A polished loading/skeleton screen for your Webinar View while:
 * - the IVS player warms up & attaches
 * - chat & offers hydrate
 * - session metadata resolves
 *
 * Tech: Next.js + Tailwind + shadcn/ui (optional) + Framer Motion
 * Styling: clean, minimal, dark-mode friendly
 */

export type WebinarViewLoadingProps = {
  /** If you want to force a compact layout (e.g., on mobile previews) */
  compact?: boolean;
  /** Optional subtitle/hint under the title skeleton */
  hint?: string;
  /** Show rotating tips below the player placeholder */
  showTips?: boolean;
  /** ClassName passthrough */
  className?: string;
};

const tips = [
  "Pro tip: We auto-seek to live once playback is ready.",
  "You can pop the chat out from the top-right menu.",
  "Engage to earn points—top attendees unlock perks.",
  "Having issues? Refresh or try a different network.",
];

export function WebinarLoadingView({ compact, hint, className }: WebinarViewLoadingProps) {
  return (
    <div className={cn("w-full h-full", className)}>
      <div className={cn("mx-auto grid gap-4 p-4 md:p-6", compact ? "max-w-6xl" : "max-w-7xl", "md:grid-cols-[1fr_360px]")}> 
        {/* Left: Player + Header + Tabs */}
        <div className="space-y-4 min-w-0">
          <HeaderSkeleton hint={hint} />
          <PlayerSkeleton />
          <TabsSkeleton />
          <PanelSkeleton />
        </div>

        {/* Right: Chat / Offers side rail */}
        <aside className="hidden md:flex flex-col gap-4">
          <ChatSkeleton />
          <AnalyticsSkeleton />
        </aside>
      </div>
    </div>
  );
}

function HeaderSkeleton({ hint }: { hint?: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-12 w-12 rounded-2xl bg-muted animate-pulse" />
      <div className="flex-1 min-w-0">
        <div className="h-5 w-56 rounded bg-muted animate-pulse" />
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          <LivePillSkeleton />
          <div className="h-3 w-16 rounded bg-muted animate-pulse" />
        </div>
        {hint ? (
          <div className="mt-1 text-xs text-muted-foreground line-clamp-1">{hint}</div>
        ) : null}
      </div>
    </div>
  );
}

function LivePillSkeleton() {
  return (
    <div className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-muted/70">
      <div className="size-1.5 rounded-full bg-destructive animate-pulse" />
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Live</span>
    </div>
  );
}

function PlayerSkeleton() {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-muted aspect-video">
      {/* Animated shimmer */}
      <div className="absolute inset-0 animate-pulse" />
      <motion.div
        aria-label="Connecting to stream"
        className="absolute inset-0 grid place-items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wifi className="size-4" />
            <span>Initializing player…</span>
          </div>
          <ProgressBar indeterminate />
          <AnimatePresence>
            <motion.div
              className="text-xs text-muted-foreground"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 0.9, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
            >
              {randomTip()}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function ProgressBar({ value = 0, indeterminate = false }: { value?: number; indeterminate?: boolean }) {
  return (
    <div className="w-56 h-1.5 overflow-hidden rounded-full bg-border">
      <div
        className={cn(
          "h-full w-1/3 bg-primary",
          indeterminate && "animate-[progress_1.2s_ease-in-out_infinite]"
        )}
        style={!indeterminate ? { width: `${value}%` } : undefined}
      />
      {/* keyframes in tailwind config not required: we use arbitrary animation name; define in globals if you prefer */}
      <style jsx global>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(25%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

function TabsSkeleton() {
  return (
    <div className="flex items-center gap-2 border-b">
      {["Chat", "Q&A", "People", "Resources"].map((t, i) => (
        <div key={t} className={cn("px-3 py-2 text-sm rounded-md", i === 0 ? "bg-muted" : "bg-transparent")}> 
          <div className="h-4 w-10 rounded bg-muted animate-pulse" />
        </div>
      ))}
      <div className="ml-auto flex items-center gap-2 pr-1 text-muted-foreground">
        <Users className="size-4" />
        <div className="h-3 w-8 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border p-4">
          <div className="h-4 w-28 rounded bg-muted animate-pulse" />
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full rounded bg-muted animate-pulse" />
            <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-3 w-2/5 rounded bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="rounded-2xl border overflow-hidden flex flex-col min-h-[420px]">
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/50">
        <MessageSquareMore className="size-4" />
        <div className="h-3 w-24 rounded bg-muted animate-pulse" />
        <div className="ml-auto flex items-center gap-2 text-muted-foreground">
          <TimerReset className="size-4" />
          <div className="h-3 w-10 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="flex-1 space-y-3 p-3 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex gap-2">
            <div className="size-7 shrink-0 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 min-w-0">
              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
              <div className="mt-2 h-3 w-full rounded bg-muted animate-pulse" />
              <div className="mt-1 h-3 w-3/5 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t">
        <div className="h-9 w-full rounded-xl bg-muted animate-pulse" />
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="rounded-2xl border overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/50">
        <BarChart3 className="size-4" />
        <div className="h-3 w-28 rounded bg-muted animate-pulse" />
      </div>
      <div className="p-4 space-y-4">
        <div className="h-36 w-full rounded-xl bg-muted animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border p-3">
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              <div className="mt-2 h-6 w-12 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function randomTip() {
  return tips[Math.floor(Math.random() * tips.length)];
}
