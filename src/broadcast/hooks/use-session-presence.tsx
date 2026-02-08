import { useEffect, useRef } from "react";
import { useWebinar } from "@/webinar/hooks";

export function useSessionPresence(accessToken: string) {
  const { recordEvent, recordEventBeacon } = useWebinar();
  const hasJoinedRef = useRef(false);
  const hasLeftRef = useRef(false);

  const markJoined = async () => {
    if (hasJoinedRef.current) return;
    hasJoinedRef.current = true;
    await recordEvent("joined", accessToken);
  };

  useEffect(() => {
    const sendLeft = async () => {
      if (hasLeftRef.current || !hasJoinedRef.current) return;
      hasLeftRef.current = true;
      await recordEventBeacon("left", accessToken);
    };

    window.addEventListener("beforeunload", sendLeft);

    return () => {
      window.removeEventListener("beforeunload", sendLeft);
      sendLeft();
    };
  }, [accessToken, recordEvent]);

  return { markJoined };
}
