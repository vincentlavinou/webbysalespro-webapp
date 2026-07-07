"use client";

import { useState } from "react";
import { RefreshCcw } from "lucide-react";

type PlaybackInterruptedNoticeProps = {
  reason: "ended" | "error";
  restoreToLive: (options?: { forceReload?: boolean }) => Promise<void>;
};

// Shown when playback stops (stream reported ended, or a fatal player error).
// Mirrors the layout-level "Refresh stream" control: force-reload the player,
// then dispatch webinar:stream:refresh so providers that hydrate on load
// re-fetch their data.
export function PlaybackInterruptedNotice({
  reason,
  restoreToLive,
}: PlaybackInterruptedNoticeProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await restoreToLive({ forceReload: true });
      window.dispatchEvent(new CustomEvent("webinar:stream:refresh"));
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 backdrop-blur-sm">
      <div className="flex max-w-xs flex-col items-center gap-3 rounded-2xl bg-black/80 px-8 py-6 text-center text-white shadow-xl backdrop-blur-sm">
        <p className="text-base font-semibold">
          {reason === "ended"
            ? "The stream has stopped"
            : "Playback was interrupted"}
        </p>
        <p className="text-xs leading-5 text-white/70">
          If the webinar is still live, refresh the stream to reconnect.
        </p>
        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={isRefreshing}
          className="flex items-center justify-center gap-2 rounded-full bg-white/95 px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-lg transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-white/70"
        >
          <RefreshCcw
            className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          <span>{isRefreshing ? "Refreshing stream…" : "Refresh stream"}</span>
        </button>
      </div>
    </div>
  );
}
