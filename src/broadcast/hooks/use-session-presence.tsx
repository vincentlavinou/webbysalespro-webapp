'use client'
import { useEffect, useRef, useCallback, useState } from "react";
import { useWebinar } from "@/webinar/hooks";

type Room = "early_access_room" | "waiting_room_entered" | "live_joined";

export function useSessionPresence() {
  const { recordEvent, recordEventBeacon } = useWebinar();
  const currentRoomRef = useRef<Room | null>(null);
  const hasLeftRef = useRef(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);

  const fireLeft = useCallback(() => {
    if (hasLeftRef.current || !currentRoomRef.current) return;
    hasLeftRef.current = true;
    recordEventBeacon("live_left");
  }, [recordEventBeacon]);

  const markRoom = useCallback(
    (room: Room) => {
      if (currentRoomRef.current === room) return;
      currentRoomRef.current = room;
      setCurrentRoom(room);
      hasLeftRef.current = false;
      recordEvent(room);
    },
    [recordEvent]
  );

  useEffect(() => {
    // Only track visibility/beforeunload when in the live room
    if (currentRoom !== "live_joined") return;

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        fireLeft();
      } else if (document.visibilityState === "visible") {
        if (hasLeftRef.current) {
          hasLeftRef.current = false;
          recordEvent("reentered");
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
  }, [currentRoom, fireLeft, recordEvent]);

  return { markRoom };
}
