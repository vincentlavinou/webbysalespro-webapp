'use client'
import { useEffect, useRef, useCallback, useState } from "react";
import { useWebinar } from "@/webinar/hooks";

type Room = "early_access_room" | "waiting_room" | "joined";

export function useSessionPresence(accessToken: string) {
  const { recordEvent, recordEventBeacon } = useWebinar();
  const currentRoomRef = useRef<Room | null>(null);
  const hasLeftRef = useRef(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);

  const fireLeft = useCallback(() => {
    if (hasLeftRef.current || !currentRoomRef.current) return;
    hasLeftRef.current = true;
    recordEventBeacon("left", accessToken);
  }, [accessToken, recordEventBeacon]);

  const markRoom = useCallback(
    (room: Room) => {
      if (currentRoomRef.current === room) return;
      currentRoomRef.current = room;
      setCurrentRoom(room);
      hasLeftRef.current = false;
      recordEvent(room, accessToken);
    },
    [accessToken, recordEvent]
  );

  useEffect(() => {
    // Only track visibility/beforeunload when in the live room
    if (currentRoom !== "joined") return;

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        fireLeft();
      } else if (document.visibilityState === "visible") {
        if (hasLeftRef.current) {
          hasLeftRef.current = false;
          recordEvent("reentered_live_room", accessToken);
        }
      }
    };

    const handleBeforeUnload = () => {
      fireLeft();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      fireLeft();
    };
  }, [accessToken, currentRoom, fireLeft, recordEvent]);

  return { markRoom };
}
