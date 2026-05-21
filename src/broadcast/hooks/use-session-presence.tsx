'use client'
import { useEffect, useRef, useCallback, useState } from "react";
import { useWebinar } from "@/webinar/hooks";

type Room = "early_access_room" | "waiting_room_entered" | "live_joined";

const WAITING_ROOM_HEARTBEAT_INTERVAL_MS = 30_000;

export function useSessionPresence() {
  const { recordEvent, recordEventBeacon } = useWebinar();
  const currentRoomRef = useRef<Room | null>(null);
  const hasLeftRef = useRef(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);

  const fireLeft = useCallback(
    (eventCode: "live_left" | "waiting_room_left") => {
      if (hasLeftRef.current || !currentRoomRef.current) return;
      hasLeftRef.current = true;
      recordEventBeacon(eventCode);
    },
    [recordEventBeacon]
  );

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
    if (currentRoom !== "live_joined") return;

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        fireLeft("live_left");
      } else if (document.visibilityState === "visible") {
        if (hasLeftRef.current) {
          hasLeftRef.current = false;
          recordEvent("reentered");
        }
      }
    };

    const handleBeforeUnload = () => {
      fireLeft("live_left");
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      fireLeft("live_left");
    };
  }, [currentRoom, fireLeft, recordEvent]);

  useEffect(() => {
    if (currentRoom !== "waiting_room_entered") return;

    const intervalId = window.setInterval(() => {
      void recordEvent("heartbeat");
    }, WAITING_ROOM_HEARTBEAT_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        fireLeft("waiting_room_left");
      } else if (document.visibilityState === "visible" && hasLeftRef.current) {
        // Backend treats waiting_room_entered as idempotent — refiring flips
        // the attendance status back to WAITING if it had been marked LEFT.
        hasLeftRef.current = false;
        void recordEvent("waiting_room_entered");
      }
    };

    const handlePageHide = () => {
      fireLeft("waiting_room_left");
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [currentRoom, fireLeft, recordEvent]);

  return { markRoom };
}
