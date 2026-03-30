"use client";

import { RefreshCcw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type StreamRefreshControlProps = {
  onRefresh: () => Promise<void> | void;
  isRefreshing?: boolean;
  className?: string;
};

export function StreamRefreshControl({
  onRefresh,
  isRefreshing = false,
  className,
}: StreamRefreshControlProps) {
  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-7 items-center gap-1 rounded-full border border-white/12 bg-black/45 px-2.5 text-[10px] font-medium text-white/80 shadow-sm backdrop-blur-md transition hover:bg-black/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/35"
            aria-label="Open stream refresh options"
          >
            <RefreshCcw className={`size-3 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Having trouble?</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="center"
          className="w-64 rounded-2xl border-white/10 bg-black/88 p-3 text-white shadow-2xl backdrop-blur-xl"
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-white">Refresh stream</p>
              <p className="text-xs leading-5 text-white/70">
                Reload the live stream without leaving this page.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void onRefresh()}
              disabled={isRefreshing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-neutral-950 transition hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:cursor-not-allowed disabled:bg-white/70"
            >
              <RefreshCcw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Refreshing stream..." : "Refresh stream"}</span>
            </button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
