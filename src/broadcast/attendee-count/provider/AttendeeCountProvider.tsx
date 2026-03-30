"use client";

import { useCallback, useState } from "react";
import { AttendeeCountContext } from "../context/AttendeeCountContext";
import { attendeeCountMetadataSchema, type AttendeeCountMetadataEvent } from "../service/schema";
import { usePlaybackMetadataEvent } from "@/emitter/playback/hooks/use-playback-metadata-event";

type Props = {
  children: React.ReactNode;
  initialCount: number;
  initialVisible: boolean;
  sessionId: string;
};

export function AttendeeCountProvider({ children, initialCount, initialVisible, sessionId }: Props) {
  const [count, setCount] = useState(initialCount);
  const [visible, setVisible] = useState(initialVisible);

  const handleEvent = useCallback((evt: AttendeeCountMetadataEvent) => {
    setVisible(evt.payload.is_attendee_count_visible);
    if (evt.payload.is_attendee_count_visible) {
      setCount(evt.payload.count);
    }
  }, []);

  usePlaybackMetadataEvent({
    eventType: "webinar:attendee_count:update",
    schema: attendeeCountMetadataSchema,
    sessionId,
    getEventKey: (evt) => evt.payload.event_key,
    getStateScope: (evt) => evt.payload.session_id,
    compareEventKeys: (incoming, latestApplied) => incoming.localeCompare(latestApplied),
    onEvent: handleEvent,
  });

  return (
    <AttendeeCountContext.Provider value={{ count, visible }}>
      {children}
    </AttendeeCountContext.Provider>
  );
}
