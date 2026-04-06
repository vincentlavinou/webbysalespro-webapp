"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { notifySuccessUiMessage } from "@/lib/notify";
import { getSessionAction } from "@/webinar/service/action";
import { WebinarSessionStatus } from "@/webinar/service/enum";
import type { WebbySalesProPlayerHandle } from "@/playback/player/ivs/WebbySalesProPlayer";

const AUTO_REFRESH_COOLDOWN_MS = 5000;

type UseAttendeeStreamRefreshOptions = {
  sessionId: string;
  playerRef: React.RefObject<WebbySalesProPlayerHandle | null>;
  enabled?: boolean;
};

type RefreshOptions = {
  showToast?: boolean;
  forceReload?: boolean;
};

export function useAttendeeStreamRefresh({
  sessionId,
  playerRef,
  enabled = true,
}: UseAttendeeStreamRefreshOptions) {
  const [isRefreshingStream, setIsRefreshingStream] = useState(false);
  const router = useRouter();
  const lastRefreshAtRef = useRef(0);
  const shouldRefreshOnReturnRef = useRef(false);

  const refreshStream = useCallback(
    async ({ showToast = false, forceReload = false }: RefreshOptions = {}) => {
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
          playerRef.current?.restoreToLive({ forceReload }),
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
      void refreshStream();
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
  }, [enabled, refreshStream]);

  const handleRefreshStream = useCallback(async () => {
    await refreshStream({ showToast: true, forceReload: true });
  }, [refreshStream]);

  return {
    isRefreshingStream,
    handleRefreshStream,
    refreshStream,
  };
}
