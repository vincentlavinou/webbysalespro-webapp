"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { notifySuccessUiMessage } from "@/lib/notify";
import { getSessionAction } from "@/webinar/service/action";
import { WebinarSessionStatus } from "@/webinar/service/enum";

export type AttendeeStreamRecoveryHandle = {
  restoreToLive: (options?: {
    forceReload?: boolean;
    gracePeriodMs?: number;
  }) => Promise<void>;
  enterFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
};

const AUTO_REFRESH_COOLDOWN_MS = 5000;

type UseAttendeeStreamRefreshOptions = {
  sessionId: string;
  playerRef: React.RefObject<AttendeeStreamRecoveryHandle | null>;
  enabled?: boolean;
  // Whether regaining focus should reconnect the player itself. Correct for HLS
  // channel streams (which drift/stall when backgrounded), but disruptive for
  // realtime WebRTC stages where `restoreToLive` is a full stage teardown +
  // rejoin. The PersistentStagePlaybackProvider already keeps the stage alive
  // and resumes via useVisibilityResilience on return, so realtime streams pass
  // `false` here: we still re-fetch data on return, just without the reconnect.
  reconnectPlayerOnReturn?: boolean;
};

type RefreshOptions = {
  showToast?: boolean;
  forceReload?: boolean;
  // When false, re-fetch data + dispatch the refresh event but leave the player
  // connection untouched (no restoreToLive).
  reconnectPlayer?: boolean;
};

export function useAttendeeStreamRefresh({
  sessionId,
  playerRef,
  enabled = true,
  reconnectPlayerOnReturn = true,
}: UseAttendeeStreamRefreshOptions) {
  const [isRefreshingStream, setIsRefreshingStream] = useState(false);
  const router = useRouter();
  const lastRefreshAtRef = useRef(0);
  const shouldRefreshOnReturnRef = useRef(false);

  const refreshStream = useCallback(
    async ({
      showToast = false,
      forceReload = false,
      reconnectPlayer = true,
    }: RefreshOptions = {}) => {
      if (!enabled || isRefreshingStream) return;

      const now = Date.now();
      if (!showToast && now - lastRefreshAtRef.current < AUTO_REFRESH_COOLDOWN_MS) {
        return;
      }

      lastRefreshAtRef.current = now;
      setIsRefreshingStream(true);

      try {
        const [sessionResult] = await Promise.all([
          getSessionAction({ id: sessionId }),
          reconnectPlayer
            ? playerRef.current?.restoreToLive({ forceReload })
            : Promise.resolve(),
        ]);

        window.dispatchEvent(new CustomEvent("webinar:stream:refresh"));

        if (showToast) {
          notifySuccessUiMessage("Reconnected to stream");
        }

        if (sessionResult?.data?.status === WebinarSessionStatus.COMPLETED) {
          router.push(`/${sessionId}/completed`);
        }
      } finally {
        setIsRefreshingStream(false);
      }
    },
    [enabled, isRefreshingStream, playerRef, router, sessionId],
  );

  useEffect(() => {
    if (!enabled) return;

    const markBackgrounded = () => {
      shouldRefreshOnReturnRef.current = true;
    };

    const refreshOnReturn = () => {
      if (document.visibilityState === "hidden") return;
      if (!shouldRefreshOnReturnRef.current) return;

      shouldRefreshOnReturnRef.current = false;
      void refreshStream({ reconnectPlayer: reconnectPlayerOnReturn });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        markBackgrounded();
        return;
      }

      refreshOnReturn();
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        shouldRefreshOnReturnRef.current = true;
      }
      refreshOnReturn();
    };

    window.addEventListener("blur", markBackgrounded);
    window.addEventListener("focus", refreshOnReturn);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("blur", markBackgrounded);
      window.removeEventListener("focus", refreshOnReturn);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, refreshStream, reconnectPlayerOnReturn]);

  const handleRefreshStream = useCallback(async () => {
    await refreshStream({ showToast: true, forceReload: true });
  }, [refreshStream]);

  return {
    isRefreshingStream,
    handleRefreshStream,
    refreshStream,
  };
}
